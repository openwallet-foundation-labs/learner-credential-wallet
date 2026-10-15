/**
 * Unlock, re-key and initialize in DatabaseAccess, with the real key
 * derivations and an in-memory stand-in for Realm, the file system,
 * SecureStore and the biometric keychain. A "realm file" here records which
 * key encrypts it and how many records it holds; Realm.open fails unless
 * given that key.
 *
 * A crash is simulated by making one step never finish, then "restarting":
 * dropping DatabaseAccess's in-memory state and keeping files, SecureStore
 * and the keychain as they were at that step.
 */
import * as nodeCrypto from 'node:crypto'
import * as SecureStore from 'expo-secure-store'
import Realm from 'realm'
import { db } from '../app/model/DatabaseAccess'
import {
  resetBiometricKeychain,
  retrieveFromBiometricKeychain,
  storeInBiometricKeychain
} from '../app/lib/biometrics'
import { legacyPlaceholderPbkdf2 } from '../app/lib/legacyPlaceholderPbkdf2'

// DatabaseAccess loads the models with a dynamic import(), which Jest
// resolves through its ESM registry. @types/jest does not declare
// unstable_mockModule.
const esmJest = jest as unknown as {
  unstable_mockModule: (path: string, factory: () => unknown) => void
}
esmJest.unstable_mockModule('../app/model/credential', () => ({
  CredentialRecord: { schema: { name: 'CredentialRecord' } }
}))
esmJest.unstable_mockModule('../app/model/did', () => ({
  DidRecord: { schema: { name: 'DidRecord' } }
}))
esmJest.unstable_mockModule('../app/model/profile', () => ({
  ProfileRecord: { schema: { name: 'ProfileRecord' } }
}))

jest.mock('../app/lib/biometrics', () => ({
  storeInBiometricKeychain: jest.fn(),
  retrieveFromBiometricKeychain: jest.fn(),
  resetBiometricKeychain: jest.fn()
}))

type MockRealmFile = {
  kind: 'realm'
  key: string
  schemaVersion: number
  counts: Record<string, number>
}
type MockFile = MockRealmFile | { kind: 'text'; text: string }

/** Modification times; every write to a file stamps it with the next tick. */
const mockMtimes = new Map<string, number>()
const mockClock = { now: 0 }
class MockFileMap extends Map<string, MockFile> {
  set(path: string, file: MockFile) {
    mockMtimes.set(path, ++mockClock.now)
    return super.set(path, file)
  }
}
const mockFiles = new MockFileMap()
const mockLog: string[] = []
const mockOpenRealms = new Set<{ path: string; isClosed: boolean }>()
const mockKeychain: { key: string | null } = { key: null }
const mockFail: {
  /**
   * Never finish this step: 'secure:<key>=<value>', 'unlink:<file>',
   * 'keychain', 'keychain reset'
   */
  hang?: (step: string) => boolean
  pointerUnreadable?: boolean
  writeCopyTo?: boolean
  open?: (path: string, key: string) => boolean
  copyCountOff?: boolean
  pointerWrite?: boolean
  /** Report a failed store, for every key or the keys this matches */
  keychainStore?: boolean | ((key: string) => boolean)
  keychainResetRejects?: boolean
  biometricsStatusUnreadable?: boolean
} = {}
const mockNever = () => new Promise<never>(() => undefined)

jest.mock('react-native-fs', () => {
  const short = (p: string) => p.replace('/mock/docs/', '')
  return {
    DocumentDirectoryPath: '/mock/docs',
    exists: jest.fn(async (p: string) => mockFiles.has(p)),
    stat: jest.fn(async (p: string) => {
      if (!mockFiles.has(p)) throw new Error(`ENOENT ${p}`)
      return { mtime: new Date(mockMtimes.get(p) ?? 0) }
    }),
    readDir: jest.fn(async (dir: string) =>
      [...mockFiles.keys()]
        .filter(
          (p) =>
            p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes('/')
        )
        .map((p) => ({ name: p.slice(dir.length + 1), path: p }))
    ),
    readFile: jest.fn(async (p: string) => {
      const file = mockFiles.get(p)
      if (file?.kind !== 'text') throw new Error(`ENOENT ${p}`)
      return file.text
    }),
    writeFile: jest.fn(async (p: string, text: string) => {
      mockFiles.set(p, { kind: 'text', text })
    }),
    unlink: jest.fn(async (p: string) => {
      if (mockFail.hang?.(`unlink:${short(p)}`)) return mockNever()
      if (!mockFiles.has(p)) throw new Error(`ENOENT ${p}`)
      if ([...mockOpenRealms].some((r) => r.path === p && !r.isClosed)) {
        throw new Error(`deleting ${p} while it is open`)
      }
      mockLog.push(`unlink ${short(p)}`)
      mockFiles.delete(p)
    })
  }
})

jest.mock('realm', () => {
  const short = (p: string) => p.replace('/mock/docs/', '')
  const keyOf = (key: Int8Array) => String.fromCharCode(...Array.from(key))
  const SCHEMA = ['CredentialRecord', 'DidRecord', 'ProfileRecord']

  class MockRealm {
    static defaultPath = '/mock/docs/default.realm'
    static open = jest.fn(async (config: any) => {
      const key = keyOf(config.encryptionKey)
      mockLog.push(`open ${short(config.path)} ${key.slice(0, 8)}`)
      let file = mockFiles.get(config.path)
      if (file === undefined) {
        file = {
          kind: 'realm',
          key,
          schemaVersion: config.schemaVersion,
          counts: Object.fromEntries(SCHEMA.map((n) => [n, 0]))
        }
        mockFiles.set(config.path, file)
      }
      if (file.kind !== 'realm' || file.key !== key) {
        throw new Error('Realm file decryption failed')
      }
      if (mockFail.open?.(config.path, key)) throw new Error('open failed')
      // Like Realm, open creates side files next to the database.
      mockFiles.set(`${config.path}.lock`, { kind: 'text', text: '' })
      return new MockRealm(config.path, file)
    })

    isClosed = false
    schema = SCHEMA.map((name) => ({ name }))
    path: string
    file: MockRealmFile
    constructor(realmPath: string, realmFile: MockRealmFile) {
      this.path = realmPath
      this.file = realmFile
      mockOpenRealms.add(this)
    }

    get schemaVersion() {
      return this.file.schemaVersion
    }

    objects(name: string) {
      return { length: this.file.counts[name] }
    }

    write(callback: () => unknown) {
      if (this.isClosed) throw new Error('Realm is closed')
      callback()
      // A committed transaction syncs the file to disk.
      mockLog.push(`commit ${short(this.path)}`)
    }

    writeCopyTo(config: any) {
      mockLog.push(`writeCopyTo ${short(config.path)}`)
      if (mockFail.writeCopyTo) throw new Error('writeCopyTo failed')
      if (mockFiles.has(config.path)) throw new Error('destination exists')
      const counts = { ...this.file.counts }
      if (mockFail.copyCountOff) counts.CredentialRecord -= 1
      mockFiles.set(config.path, {
        ...this.file,
        counts,
        key: keyOf(config.encryptionKey)
      })
    }

    close() {
      this.isClosed = true
      mockLog.push(`close ${short(this.path)}`)
    }
  }

  return { __esModule: true, default: MockRealm }
})

const secure = new Map<string, string>()
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>
const mockRealmOpen = Realm.open as unknown as jest.Mock

const DIR = '/mock/docs'
const WALLET = `${DIR}/default.realm`
const SALT_PATH = `${DIR}/edu-wallet-salt`
const SALT = '�\u0007salt�é\u001b'
const PASSPHRASE = 'correct horse battery staple'
const COUNTS = { CredentialRecord: 5, DidRecord: 2, ProfileRecord: 2 }

// Releases up to 2.0.24 and 2.2.5 derived PBKDF2-SHA512 keys, and 2.1.0 to
// 2.2.4 PBKDF2-SHA1 keys, with native code; Node is the reference.
// 2.2.6-2.2.10 used the placeholder.
const REAL_KEY = nodeCrypto
  .pbkdf2Sync(PASSPHRASE, SALT, 10000, 32, 'sha512')
  .toString('hex')
const SHA1_KEY = nodeCrypto
  .pbkdf2Sync(PASSPHRASE, SALT, 10000, 32, 'sha1')
  .toString('hex')
const LEGACY_KEY = Buffer.from(
  legacyPlaceholderPbkdf2(PASSPHRASE, SALT, 10000, 32)
).toString('hex')
const fingerprint = (key: string) =>
  nodeCrypto.createHash('sha256').update(key).digest('hex')

function realmFile(key: string): MockRealmFile {
  return { kind: 'realm', key, schemaVersion: 4, counts: { ...COUNTS } }
}

function walletEncryptedWith(key: string, path = WALLET) {
  mockFiles.set(SALT_PATH, { kind: 'text', text: SALT })
  mockFiles.set(path, realmFile(key))
}

/** Realm files that exist, by name, with the key that opens each. */
function walletFiles(): Record<string, string> {
  return Object.fromEntries(
    [...mockFiles.entries()]
      .filter(([, f]) => f.kind === 'realm')
      .map(([p, f]) => [p.slice(DIR.length + 1), (f as MockRealmFile).key])
  )
}

function rekeyedNames(): string[] {
  return Object.keys(walletFiles()).filter((n) => /^wallet-\d+\.realm$/.test(n))
}

function currentFile(): MockRealmFile {
  const name = secure.get('wallet_file') ?? 'default.realm'
  return mockFiles.get(`${DIR}/${name}`) as MockRealmFile
}

function openedKeys(): string[] {
  return mockRealmOpen.mock.calls.map(([config]) =>
    String.fromCharCode(...Array.from(config.encryptionKey as Int8Array))
  )
}

function enableBiometricsWith(key: string) {
  secure.set('biometrics_status', 'enabled')
  secure.set('biometric_key_fingerprint', fingerprint(key))
  mockKeychain.key = key
}

/** Waits until the operation in flight has reached a hung step. */
async function settle() {
  for (let i = 0; i < 50; i++) await new Promise((r) => setImmediate(r))
}

/** The app was killed: keep files, SecureStore and keychain only. */
function restart() {
  ;(db as any).realm = null
  ;(db as any).queue = Promise.resolve()
  ;(db as any).madeCurrentThisProcess = new Set()
  for (const r of mockOpenRealms) r.isClosed = true
  for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
  mockLog.length = 0
  mockRealmOpen.mockClear()
}

/** Runs an operation until it reaches the step `hang` matches, then restarts. */
async function crashAt(hang: (step: string) => boolean, run: () => unknown) {
  mockFail.hang = hang
  void run()
  await settle()
  restart()
}

const isRekeyPointerWrite = (step: string) =>
  /^secure:wallet_file=wallet-\d+\.realm$/.test(step)

beforeEach(() => {
  mockFiles.clear()
  mockMtimes.clear()
  mockClock.now = 0
  mockLog.length = 0
  mockOpenRealms.clear()
  mockKeychain.key = null
  for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
  secure.clear()
  mockRealmOpen.mockClear()
  ;(db as any).realm = null
  ;(db as any).queue = Promise.resolve()
  ;(db as any).madeCurrentThisProcess = new Set()
  mockSecureStore.getItemAsync.mockImplementation(async (k: string) => {
    if (k === 'wallet_file' && mockFail.pointerUnreadable) {
      throw new Error('SecureStore read failed')
    }
    if (k === 'biometrics_status' && mockFail.biometricsStatusUnreadable) {
      throw new Error('SecureStore read failed')
    }
    return secure.get(k) ?? null
  })
  mockSecureStore.setItemAsync.mockImplementation(
    async (k: string, v: string) => {
      if (mockFail.hang?.(`secure:${k}=${v}`)) return mockNever()
      if (k === 'wallet_file' && mockFail.pointerWrite) {
        throw new Error('SecureStore failed')
      }
      mockLog.push(k === 'wallet_file' ? `pointer ${v}` : `secure ${k}=${v}`)
      secure.set(k, v)
    }
  )
  mockSecureStore.deleteItemAsync.mockImplementation(async (k: string) => {
    mockLog.push(`delete ${k}`)
    secure.delete(k)
  })
  ;(storeInBiometricKeychain as jest.Mock)
    .mockReset()
    .mockImplementation(async (key: string) => {
      if (mockFail.hang?.('keychain')) return mockNever()
      const fail = mockFail.keychainStore
      if (fail === true || (typeof fail === 'function' && fail(key))) {
        return false
      }
      mockLog.push('keychain store')
      mockKeychain.key = key
      return true
    })
  ;(retrieveFromBiometricKeychain as jest.Mock)
    .mockReset()
    .mockImplementation(async () => {
      mockLog.push('keychain read')
      if (mockKeychain.key === null) throw new Error('No key')
      return mockKeychain.key
    })
  ;(resetBiometricKeychain as jest.Mock)
    .mockReset()
    .mockImplementation(async () => {
      if (mockFail.hang?.('keychain reset')) return mockNever()
      if (mockFail.keychainResetRejects) throw new Error('Keychain failed')
      mockLog.push('keychain reset')
      mockKeychain.key = null
    })
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  ;(console.error as jest.Mock).mockRestore()
})

it('uses distinct keys for each derivation of the test passphrase', () => {
  for (const key of [REAL_KEY, SHA1_KEY, LEGACY_KEY]) {
    expect(key).toMatch(/^[0-9a-f]{64}$/)
  }
  expect(new Set([REAL_KEY, SHA1_KEY, LEGACY_KEY]).size).toBe(3)
})

describe('unlock: wallet already on the current key (PBKDF2-SHA512)', () => {
  it('opens with the current key and names default.realm in the pointer', async () => {
    walletEncryptedWith(REAL_KEY)

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('privileged_key_status')).toBe('unlocked')
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(walletFiles()).toEqual({ 'default.realm': REAL_KEY })
  })

  it('opens again after an explicit lock', async () => {
    walletEncryptedWith(REAL_KEY)
    await db.unlock(PASSPHRASE)
    await db.lock()
    expect(secure.get('privileged_key_status')).toBe('locked')
    expect(secure.get('privileged_key')).toBe('')

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY, REAL_KEY])
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
  })
})

describe.each([
  ['2.1.0-2.2.4 (PBKDF2-SHA1)', SHA1_KEY, 'legacy-sha1', [REAL_KEY, SHA1_KEY]],
  [
    '2.2.6-2.2.10 (placeholder)',
    LEGACY_KEY,
    'legacy-placeholder',
    [REAL_KEY, SHA1_KEY, LEGACY_KEY]
  ]
])('unlock: wallet set up on %s', (_, oldKey, oldDerivation, tried) => {
  it('tries the current key, then the legacy keys, then re-keys to a new file', async () => {
    walletEncryptedWith(oldKey)

    await db.unlock(PASSPHRASE)

    const [name] = rekeyedNames()
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(openedKeys()).toEqual([...tried, REAL_KEY])
    expect(mockLog.indexOf(`pointer ${name}`)).toBeGreaterThan(
      mockLog.indexOf(`open ${name} ${REAL_KEY.slice(0, 8)}`)
    )
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
    // The new file stays open as the wallet; the old one was closed.
    expect(
      [...mockOpenRealms].filter((r) => !r.isClosed).map((r) => r.path)
    ).toEqual([`${DIR}/${name}`])
  })

  it('keeps the old file until the new one has opened in a later process', async () => {
    walletEncryptedWith(oldKey)
    await db.unlock(PASSPHRASE)
    const [name] = rekeyedNames()
    expect(walletFiles()).toEqual({
      'default.realm': oldKey,
      [name]: REAL_KEY
    })

    // Same process: still kept
    await db.lock()
    await db.unlock(PASSPHRASE)
    expect(Object.keys(walletFiles())).toHaveLength(2)

    // Next process: the new file opens, so the old one goes
    await db.lock()
    restart()
    await db.unlock(PASSPHRASE)
    expect(openedKeys()).toEqual([REAL_KEY])
    expect(walletFiles()).toEqual({ [name]: REAL_KEY })
  })

  it('does not fall back to the old file if the new one will not open', async () => {
    walletEncryptedWith(oldKey)
    await db.unlock(PASSPHRASE)
    const [name] = rekeyedNames()
    await db.lock()
    restart()
    mockFail.open = (path) => path === `${DIR}/${name}`

    await expect(db.unlock(PASSPHRASE)).rejects.toThrow('open failed')

    expect(openedKeys()).toEqual([REAL_KEY])
    expect(secure.get('wallet_file')).toBe(name)
    expect(Object.keys(walletFiles())).toHaveLength(2)
  })

  it('records the legacy derivation when re-keying fails', async () => {
    walletEncryptedWith(oldKey)
    mockFail.writeCopyTo = true

    await db.unlock(PASSPHRASE)

    expect(secure.get('privileged_key')).toBe(oldKey)
    expect(secure.get('wallet_key_derivation')).toBe(oldDerivation)
  })
})

describe('unlock: a re-key failure before the switch leaves the old file current', () => {
  async function expectOnLegacyKeyAndIntact() {
    expect(walletFiles()).toEqual({ 'default.realm': LEGACY_KEY })
    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(secure.get('privileged_key_status')).toBe('unlocked')
    expect(secure.get('privileged_key')).toBe(LEGACY_KEY)
    expect(mockLog).not.toContain('unlink default.realm')

    // The next unlock tries again, and succeeds once nothing fails.
    await db.lock()
    for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
    await db.unlock(PASSPHRASE)
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
  }

  it('when writing the copy fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.writeCopyTo = true
    await db.unlock(PASSPHRASE)
    await expectOnLegacyKeyAndIntact()
  })

  it('when the copy does not open with the new key', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.open = (path) => /wallet-\d+\.realm$/.test(path)
    await db.unlock(PASSPHRASE)
    await expectOnLegacyKeyAndIntact()
  })

  it('when the copy holds a different number of records', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.copyCountOff = true
    await db.unlock(PASSPHRASE)
    await expectOnLegacyKeyAndIntact()
  })

  it('when writing the pointer to the new file fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    secure.set('wallet_file', 'default.realm')
    mockFail.pointerWrite = true
    await db.unlock(PASSPHRASE)
    await expectOnLegacyKeyAndIntact()
  })

  it('and puts the old key back in the keychain', async () => {
    walletEncryptedWith(LEGACY_KEY)
    secure.set('wallet_file', 'default.realm')
    enableBiometricsWith(LEGACY_KEY)
    mockFail.pointerWrite = true

    await db.unlock(PASSPHRASE)

    expect(mockKeychain.key).toBe(LEGACY_KEY)
    expect(secure.get('biometric_key_fingerprint')).toBe(
      fingerprint(LEGACY_KEY)
    )
    expect(secure.get('biometrics_status')).toBe('enabled')
  })
})

describe('crash before the pointer write', () => {
  it('the old file stays current and a passphrase unlock re-keys again', async () => {
    walletEncryptedWith(LEGACY_KEY)
    await crashAt(isRekeyPointerWrite, () => db.unlock(PASSPHRASE))
    const [orphan] = rekeyedNames()
    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(walletFiles()).toEqual({
      'default.realm': LEGACY_KEY,
      [orphan]: REAL_KEY
    })
    expect(await db.isInitialized()).toBe(true)

    await db.unlock(PASSPHRASE)

    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(secure.get('wallet_file')).not.toBe(orphan)
    // Once the new file has opened in a later process, everything older,
    // including the orphan, goes.
    await db.lock()
    restart()
    await db.unlock(PASSPHRASE)
    expect(Object.keys(walletFiles())).toEqual([secure.get('wallet_file')])
  })

  it('biometrics, keychain already holding the new key: adopts the new file', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    secure.set('wallet_key_derivation', 'legacy-placeholder')
    await crashAt(isRekeyPointerWrite, () => db.unlock(PASSPHRASE))
    expect(mockKeychain.key).toBe(REAL_KEY)
    expect(secure.has('biometric_key_fingerprint')).toBe(false)

    await db.unlockWithBiometrics()

    const [name] = rekeyedNames()
    expect(secure.get('wallet_file')).toBe(name)
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('biometric_key_fingerprint')).toBe(fingerprint(REAL_KEY))
    // A stored key does not say how it was derived.
    expect(secure.has('wallet_key_derivation')).toBe(false)
    // Nothing is deleted on the unlock that switched files.
    expect(Object.keys(walletFiles())).toHaveLength(2)
  })

  it('biometrics, keychain still holding the old key: opens the old file and keeps the newer one', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    await crashAt(
      (step) => step === 'keychain',
      () => db.unlock(PASSPHRASE)
    )
    expect(mockKeychain.key).toBe(LEGACY_KEY)
    const [orphan] = rekeyedNames()

    await db.unlockWithBiometrics()

    expect(secure.get('privileged_key')).toBe(LEGACY_KEY)
    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(walletFiles()).toEqual({
      'default.realm': LEGACY_KEY,
      [orphan]: REAL_KEY
    })
    expect(secure.get('biometric_key_fingerprint')).toBe(
      fingerprint(LEGACY_KEY)
    )
  })
})

describe('crash right after the pointer write', () => {
  async function crashAfterPointer() {
    walletEncryptedWith(LEGACY_KEY)
    await crashAt(
      (step) => step === 'secure:privileged_key_status=unlocked',
      () => db.unlock(PASSPHRASE)
    )
    const [name] = rekeyedNames()
    expect(secure.get('wallet_file')).toBe(name)
    expect(walletFiles()).toEqual({
      'default.realm': LEGACY_KEY,
      [name]: REAL_KEY
    })
    return name
  }

  it('a passphrase unlock opens the new file and deletes the old one', async () => {
    const name = await crashAfterPointer()

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
    expect(walletFiles()).toEqual({ [name]: REAL_KEY })
  })

  it('biometrics opens the new file with the new key', async () => {
    secure.set('biometrics_status', 'enabled')
    mockKeychain.key = LEGACY_KEY
    const name = await crashAfterPointer()
    expect(mockKeychain.key).toBe(REAL_KEY)

    await db.unlockWithBiometrics()

    expect(walletFiles()).toEqual({ [name]: REAL_KEY })
    expect(secure.get('biometric_key_fingerprint')).toBe(fingerprint(REAL_KEY))
  })
})

describe('biometric unlock never rolls back to default.realm (item 1)', () => {
  it('does not adopt default.realm when the pointer names a re-keyed file', async () => {
    // A re-keyed wallet whose old file is still kept, and a keychain that
    // somehow holds the old key.
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-500.realm`, realmFile(REAL_KEY))
    secure.set('wallet_file', 'wallet-500.realm')
    secure.set('wallet_key_derivation', 'pbkdf2-sha512')
    enableBiometricsWith(LEGACY_KEY)

    await expect(db.unlockWithBiometrics()).rejects.toThrow()

    expect(secure.get('wallet_file')).toBe('wallet-500.realm')
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
    expect(walletFiles()).toEqual({
      'default.realm': LEGACY_KEY,
      'wallet-500.realm': REAL_KEY
    })
    await db.unlock(PASSPHRASE)
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
  })

  it('never adopts an older re-keyed file than the current one', async () => {
    walletEncryptedWith(REAL_KEY, `${DIR}/wallet-500.realm`)
    mockFiles.set(`${DIR}/wallet-400.realm`, realmFile(LEGACY_KEY))
    secure.set('wallet_file', 'wallet-500.realm')
    enableBiometricsWith(LEGACY_KEY)

    await expect(db.unlockWithBiometrics()).rejects.toThrow()

    expect(secure.get('wallet_file')).toBe('wallet-500.realm')
    expect(Object.keys(walletFiles())).toHaveLength(2)
  })

  it.each([
    ['pbkdf2-sha512', 1],
    [null, 3]
  ])(
    'on default.realm with the marker %s, a wrong passphrase makes %i opens',
    async (marker, opens) => {
      walletEncryptedWith(REAL_KEY)
      if (marker !== null) secure.set('wallet_key_derivation', marker)

      await expect(db.unlock('wrong passphrase')).rejects.toThrow(
        'Realm file decryption failed'
      )

      expect(openedKeys()).toHaveLength(opens)
    }
  )

  it('needs no legacy keys when only re-keyed files exist', async () => {
    walletEncryptedWith(REAL_KEY, `${DIR}/wallet-500.realm`)
    secure.set('wallet_file', 'wallet-500.realm')

    await expect(db.unlock('wrong passphrase')).rejects.toThrow(
      'Realm file decryption failed'
    )

    expect(openedKeys()).toHaveLength(1)
  })
})

describe('no usable pointer (item 4)', () => {
  it.each([
    ['absent', () => undefined],
    ['unreadable', () => (mockFail.pointerUnreadable = true)],
    ['naming a missing file', () => secure.set('wallet_file', 'wallet-1.realm')]
  ])(
    'with the pointer %s, prefers the newest re-keyed file over default.realm',
    async (_, setUp) => {
      walletEncryptedWith(LEGACY_KEY)
      mockFiles.set(`${DIR}/wallet-500.realm`, realmFile(REAL_KEY))
      setUp()

      await db.unlock(PASSPHRASE)

      expect(openedKeys()).toEqual([REAL_KEY])
      expect(secure.get('privileged_key')).toBe(REAL_KEY)
      // Not deleted on a fallback: default.realm stays for now.
      expect(Object.keys(walletFiles()).sort()).toEqual([
        'default.realm',
        'wallet-500.realm'
      ])
    }
  )

  it('still tries the legacy keys on default.realm if the re-keyed file fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-500.realm`, realmFile(SHA1_KEY))

    await db.unlock(PASSPHRASE)

    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    // The unreadable newer file was not deleted.
    expect(mockFiles.has(`${DIR}/wallet-500.realm`)).toBe(true)
  })

  it('falls back to default.realm when the named file is gone', async () => {
    walletEncryptedWith(REAL_KEY)
    secure.set('wallet_file', 'wallet-123.realm')

    expect(await db.isInitialized()).toBe(true)
    await db.unlock(PASSPHRASE)

    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
  })

  it('never deletes a file newer than the current one', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-500.realm`, realmFile(SHA1_KEY))
    secure.set('wallet_file', 'default.realm')
    mockFail.writeCopyTo = true

    await db.unlock(PASSPHRASE)

    expect(mockFiles.has(`${DIR}/wallet-500.realm`)).toBe(true)
  })
})

describe('unlock: biometric keychain', () => {
  it('stores the new key before the switch when biometrics is on', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    const [name] = rekeyedNames()
    expect(mockLog.indexOf('keychain store')).toBeLessThan(
      mockLog.indexOf(`pointer ${name}`)
    )
    expect(mockKeychain.key).toBe(REAL_KEY)
    expect(secure.get('biometrics_status')).toBe('enabled')
    expect(secure.get('biometric_key_fingerprint')).toBe(fingerprint(REAL_KEY))
  })

  it('leaves the keychain alone when biometrics is off', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    expect(storeInBiometricKeychain).not.toHaveBeenCalled()
  })

  it('leaves the keychain alone when it already holds the key', async () => {
    walletEncryptedWith(REAL_KEY)
    enableBiometricsWith(REAL_KEY)

    await db.unlock(PASSPHRASE)

    expect(storeInBiometricKeychain).not.toHaveBeenCalled()
  })

  it('replaces an unknown keychain key on any passphrase unlock', async () => {
    walletEncryptedWith(REAL_KEY)
    secure.set('biometrics_status', 'enabled')

    await db.unlock(PASSPHRASE)

    expect(mockKeychain.key).toBe(REAL_KEY)
    expect(secure.get('biometric_key_fingerprint')).toBe(fingerprint(REAL_KEY))
  })
})

describe('re-key when the new key cannot be stored (item 2)', () => {
  it('turns biometrics off before switching files', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    mockFail.keychainStore = true

    await db.unlock(PASSPHRASE)

    const [name] = rekeyedNames()
    const switchAt = mockLog.indexOf(`pointer ${name}`)
    expect(switchAt).toBeGreaterThan(-1)
    expect(mockLog.indexOf('secure biometrics_status=disabled')).toBeLessThan(
      switchAt
    )
    expect(mockLog.indexOf('keychain reset')).toBeLessThan(switchAt)
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(secure.get('biometrics_status')).toBe('disabled')
    expect(secure.has('biometric_key_fingerprint')).toBe(false)
  })

  it('a crash right after the switch leaves biometrics off', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    mockFail.keychainStore = true
    await crashAt(
      (step) => step === 'secure:privileged_key_status=unlocked',
      () => db.unlock(PASSPHRASE)
    )

    expect(secure.get('biometrics_status')).toBe('disabled')
    await expect(db.unlockWithBiometrics()).rejects.toThrow(
      'Biometric authentication is not enabled.'
    )
  })
})

describe('disableBiometrics (item 3)', () => {
  it('drops the fingerprint before anything else', async () => {
    enableBiometricsWith(REAL_KEY)
    await crashAt(
      (step) => step === 'keychain reset',
      () => db.disableBiometrics()
    )

    expect(secure.has('biometric_key_fingerprint')).toBe(false)
    expect(secure.get('biometrics_status')).toBe('disabled')
  })

  it('leaves no fingerprint even if it stops at the status write', async () => {
    enableBiometricsWith(REAL_KEY)
    await crashAt(
      (step) => step === 'secure:biometrics_status=disabled',
      () => db.disableBiometrics()
    )

    expect(secure.has('biometric_key_fingerprint')).toBe(false)
    expect(mockKeychain.key).toBe(REAL_KEY)
  })
})

describe('unlock: failures', () => {
  it('rejects a wrong passphrase with the current key error and changes nothing', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await expect(db.unlock('wrong passphrase')).rejects.toThrow(
      'Realm file decryption failed'
    )

    expect(openedKeys()).toHaveLength(3)
    expect(walletFiles()).toEqual({ 'default.realm': LEGACY_KEY })
    expect(await db.isUnlocked()).toBe(false)
  })

  it('never creates a wallet that is not there', async () => {
    mockFiles.set(SALT_PATH, { kind: 'text', text: SALT })

    await expect(db.unlock(PASSPHRASE)).rejects.toThrow(
      'Wallet database not found.'
    )

    expect(mockRealmOpen).not.toHaveBeenCalled()
    expect(walletFiles()).toEqual({})
  })

  it('clears the stored key if marking the wallet unlocked fails', async () => {
    walletEncryptedWith(REAL_KEY)
    mockSecureStore.setItemAsync.mockImplementation(
      async (k: string, v: string) => {
        if (k === 'privileged_key_status' && v === 'unlocked') {
          throw new Error('SecureStore failed')
        }
        secure.set(k, v)
      }
    )

    await expect(db.unlock(PASSPHRASE)).rejects.toThrow('SecureStore failed')

    expect(secure.get('privileged_key')).toBe('')
    expect(secure.get('privileged_key_status')).toBe('locked')
    expect([...mockOpenRealms].every((r) => r.isClosed)).toBe(true)
  })
})

describe('concurrency', () => {
  it('runs a double submit one after the other, re-keying once', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await Promise.all([db.unlock(PASSPHRASE), db.unlock(PASSPHRASE)])

    expect(mockLog.filter((e) => e.startsWith('writeCopyTo'))).toHaveLength(1)
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
  })

  it('reads the keychain at once but opens only after a passphrase unlock finishes', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)

    await Promise.all([db.unlock(PASSPHRASE), db.unlockWithBiometrics()])

    const [name] = rekeyedNames()
    expect(mockLog.indexOf('keychain read')).toBeLessThan(
      mockLog.indexOf(`pointer ${name}`)
    )
    // The biometric unlock found the wallet already unlocked.
    expect(openedKeys()).toHaveLength(4)
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
  })

  it('withInstance waits for an unlock instead of opening its own', async () => {
    walletEncryptedWith(REAL_KEY)

    const [, instance] = await Promise.all([
      db.unlock(PASSPHRASE),
      db.withInstance((realm) => realm)
    ])

    expect(openedKeys()).toEqual([REAL_KEY])
    expect((instance as any).isClosed).toBe(false)
  })

  it('withInstance refuses while locked', async () => {
    walletEncryptedWith(REAL_KEY)

    await expect(db.withInstance((realm) => realm)).rejects.toThrow(
      'Wallet is not unlocked.'
    )
    expect(mockRealmOpen).not.toHaveBeenCalled()
  })
})

describe('initialize', () => {
  it('creates the wallet with the current key, unlocked, deriving once', async () => {
    secure.set('privileged_key_status', 'locked')
    const walletKey = require('../app/lib/walletKey')
    const derive = jest.spyOn(walletKey, 'deriveWalletKeyHex')
    const legacy = jest.spyOn(walletKey, 'deriveLegacyKeyHex')

    await db.initialize(PASSPHRASE)
    await db.unlock(PASSPHRASE)

    const salt = (mockFiles.get(SALT_PATH) as { text: string }).text
    const expected = nodeCrypto
      .pbkdf2Sync(PASSPHRASE, salt, 10000, 32, 'sha512')
      .toString('hex')
    expect(openedKeys()).toEqual([expected])
    expect(walletFiles()).toEqual({ 'default.realm': expected })
    expect(derive).toHaveBeenCalledTimes(1)
    expect(legacy).not.toHaveBeenCalled()
    expect(secure.get('privileged_key')).toBe(expected)
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
    derive.mockRestore()
    legacy.mockRestore()
  })

  it.each(['default.realm', 'wallet-123.realm'])(
    'refuses to run while %s exists',
    async (name) => {
      mockFiles.set(`${DIR}/${name}`, realmFile(LEGACY_KEY))

      await expect(db.initialize(PASSPHRASE)).rejects.toThrow(
        'Wallet must be in reset state'
      )
      expect(mockFiles.has(SALT_PATH)).toBe(false)
    }
  )

  it('replaces a pointer to a file that is gone', async () => {
    secure.set('wallet_file', 'wallet-123.realm')

    await db.initialize(PASSPHRASE)

    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(Object.keys(walletFiles())).toEqual(['default.realm'])
  })

  it('resets biometric state left by a previous install (item 6)', async () => {
    enableBiometricsWith('key-from-a-previous-install')

    await db.initialize(PASSPHRASE)

    expect(secure.get('biometrics_status')).toBe('disabled')
    expect(secure.has('biometric_key_fingerprint')).toBe(false)
    expect(mockKeychain.key).toBeNull()
    await expect(db.unlockWithBiometrics()).rejects.toThrow(
      'Biometric authentication is not enabled.'
    )
  })
})

describe('lock', () => {
  it('marks the wallet locked, then closes it', async () => {
    walletEncryptedWith(REAL_KEY)
    await db.unlock(PASSPHRASE)
    const open = [...mockOpenRealms].filter((r) => !r.isClosed)
    expect(open).toHaveLength(1)
    mockLog.length = 0

    await db.lock()

    expect(open[0].isClosed).toBe(true)
    expect(mockLog.indexOf('secure privileged_key_status=locked')).toBeLessThan(
      mockLog.indexOf('close default.realm')
    )
  })
})

describe('unlockWithBiometrics', () => {
  it('opens with the key from the biometric keychain', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)

    await db.unlockWithBiometrics()

    expect(openedKeys()).toEqual([LEGACY_KEY])
    expect(await db.isUnlocked()).toBe(true)
  })

  it('refuses when biometrics is not enabled', async () => {
    walletEncryptedWith(REAL_KEY)

    await expect(db.unlockWithBiometrics()).rejects.toThrow(
      'Biometric authentication is not enabled.'
    )
    expect(retrieveFromBiometricKeychain).not.toHaveBeenCalled()
  })

  it('leaves no key behind when the keychain key opens nothing', async () => {
    walletEncryptedWith(REAL_KEY)
    enableBiometricsWith(LEGACY_KEY)

    await expect(db.unlockWithBiometrics()).rejects.toThrow()

    expect(await db.isUnlocked()).toBe(false)
    expect(secure.get('privileged_key') ?? '').toBe('')
    expect(walletFiles()).toEqual({ 'default.realm': REAL_KEY })
  })
})

describe('enableBiometrics', () => {
  it('stays off, with no fingerprint, if the key cannot be stored', async () => {
    walletEncryptedWith(REAL_KEY)
    await db.unlock(PASSPHRASE)
    secure.set('biometric_key_fingerprint', 'stale')
    mockFail.keychainStore = true

    await db.enableBiometrics()

    expect(secure.get('biometrics_status')).not.toBe('enabled')
    expect(secure.has('biometric_key_fingerprint')).toBe(false)
  })

  it('records the fingerprint of the stored key', async () => {
    walletEncryptedWith(REAL_KEY)
    await db.unlock(PASSPHRASE)

    await db.enableBiometrics()

    expect(secure.get('biometrics_status')).toBe('enabled')
    expect(secure.get('biometric_key_fingerprint')).toBe(fingerprint(REAL_KEY))
  })
})

describe('reset', () => {
  it('removes every wallet file, side file and pointer', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-5.realm`, realmFile(REAL_KEY))
    mockFiles.set(`${DIR}/wallet-5.realm.lock`, { kind: 'text', text: '' })
    mockFiles.set(`${DIR}/wallet-4.realm.note`, { kind: 'text', text: '' })
    for (const s of ['.lock', '.note', '.management']) {
      mockFiles.set(`${WALLET}${s}`, { kind: 'text', text: '' })
    }
    secure.set('wallet_file', 'wallet-5.realm')
    secure.set('wallet_key_derivation', 'pbkdf2-sha512')

    await db.reset()

    expect([...mockFiles.keys()]).toEqual([SALT_PATH])
    expect(secure.has('wallet_file')).toBe(false)
    expect(secure.has('wallet_key_derivation')).toBe(false)
    expect(await db.isInitialized()).toBe(false)
  })

  it('does not throw when files are already missing', async () => {
    mockFiles.set(`${WALLET}.lock`, { kind: 'text', text: '' })

    await expect(db.reset()).resolves.toBeUndefined()
    expect(mockFiles.size).toBe(0)
  })
})

describe('a pointed file that will not open (rule A)', () => {
  function setUp() {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-500.realm`, realmFile(REAL_KEY))
    secure.set('wallet_file', 'wallet-500.realm')
    secure.set('wallet_key_derivation', 'pbkdf2-sha512')
    // A transient error, not a wrong key
    mockFail.open = (path) => path === `${DIR}/wallet-500.realm`
  }

  function expectNothingChanged() {
    expect(secure.get('wallet_file')).toBe('wallet-500.realm')
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
    expect(walletFiles()).toEqual({
      'default.realm': LEGACY_KEY,
      'wallet-500.realm': REAL_KEY
    })
    expect(mockLog.filter((e) => e.startsWith('unlink '))).toEqual([])
  }

  it('passphrase: reports the error and tries no other file', async () => {
    setUp()

    await expect(db.unlock(PASSPHRASE)).rejects.toThrow('open failed')

    expect(mockRealmOpen.mock.calls.map(([c]) => c.path)).toEqual([
      `${DIR}/wallet-500.realm`
    ])
    expectNothingChanged()
    expect(await db.isUnlocked()).toBe(false)
  })

  it('biometrics: reports the error and tries no other file', async () => {
    setUp()
    enableBiometricsWith(REAL_KEY)

    await expect(db.unlockWithBiometrics()).rejects.toThrow('open failed')

    expectNothingChanged()
  })
})

describe('choosing a file without a usable pointer (rule B)', () => {
  it('takes the file written to last, not the newest name', async () => {
    // A stale orphan with a newer name but an older modification time
    walletEncryptedWith(REAL_KEY)
    mockFiles.set(`${DIR}/wallet-900.realm`, realmFile(REAL_KEY))
    mockMtimes.set(`${DIR}/wallet-900.realm`, 1)
    mockMtimes.set(WALLET, 2)

    await db.unlock(PASSPHRASE)

    expect(mockRealmOpen.mock.calls.map(([c]) => c.path)).toEqual([WALLET])
    expect(secure.get('wallet_file')).toBe('default.realm')
    // Nothing is deleted in the process that chose the file...
    expect(mockFiles.has(`${DIR}/wallet-900.realm`)).toBe(true)
    await db.lock()
    await db.unlock(PASSPHRASE)
    expect(mockFiles.has(`${DIR}/wallet-900.realm`)).toBe(true)
  })

  it('takes a re-keyed file when it was written to last', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-900.realm`, realmFile(REAL_KEY))

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
    expect(secure.get('wallet_file')).toBe('wallet-900.realm')
  })
})

describe('stored-key forward moves (rule C)', () => {
  it('refuses a newer-named orphan written before the current file', async () => {
    // An interrupted re-key left wallet-900 and the new key in the
    // keychain; the user then kept writing to default.realm.
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-900.realm`, realmFile(REAL_KEY))
    mockMtimes.set(`${DIR}/wallet-900.realm`, 1)
    mockMtimes.set(WALLET, 2)
    secure.set('wallet_file', 'default.realm')
    enableBiometricsWith(REAL_KEY)

    await expect(db.unlockWithBiometrics()).rejects.toThrow(
      'Realm file decryption failed'
    )

    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(Object.keys(walletFiles()).sort()).toEqual([
      'default.realm',
      'wallet-900.realm'
    ])
  })

  it('accepts one written after the current file', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${DIR}/wallet-900.realm`, realmFile(REAL_KEY))
    secure.set('wallet_file', 'default.realm')
    enableBiometricsWith(REAL_KEY)

    await db.unlockWithBiometrics()

    expect(secure.get('wallet_file')).toBe('wallet-900.realm')
  })
})

describe('re-key when the biometrics status cannot be read (rule E)', () => {
  it('stays on the current file and key, and re-keys at the next unlock', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.biometricsStatusUnreadable = true

    await db.unlock(PASSPHRASE)

    expect(mockLog).not.toContainEqual(expect.stringMatching(/writeCopyTo/))
    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(walletFiles()).toEqual({ 'default.realm': LEGACY_KEY })
    expect(secure.get('privileged_key')).toBe(LEGACY_KEY)

    await db.lock()
    delete mockFail.biometricsStatusUnreadable
    await db.unlock(PASSPHRASE)
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
  })
})

describe('pointer write failing after biometrics was turned off (rule F)', () => {
  function setUp() {
    walletEncryptedWith(LEGACY_KEY)
    secure.set('wallet_file', 'default.realm')
    enableBiometricsWith(LEGACY_KEY)
    mockFail.pointerWrite = true
  }

  it('turns biometrics back on with the old key', async () => {
    setUp()
    mockFail.keychainStore = (key) => key === REAL_KEY

    await db.unlock(PASSPHRASE)

    expect(walletFiles()).toEqual({ 'default.realm': LEGACY_KEY })
    expect(secure.get('biometrics_status')).toBe('enabled')
    expect(mockKeychain.key).toBe(LEGACY_KEY)
    expect(secure.get('biometric_key_fingerprint')).toBe(
      fingerprint(LEGACY_KEY)
    )
  })

  it('leaves it off if the old key cannot be stored either', async () => {
    setUp()
    mockFail.keychainStore = true

    await db.unlock(PASSPHRASE)

    expect(secure.get('biometrics_status')).toBe('disabled')
    expect(secure.has('biometric_key_fingerprint')).toBe(false)
  })
})

describe('initialize with a failing keychain (rule G)', () => {
  it('still resets biometric state and creates the wallet', async () => {
    enableBiometricsWith('key-from-a-previous-install')
    mockFail.keychainResetRejects = true

    await db.initialize(PASSPHRASE)

    expect(secure.get('biometrics_status')).toBe('disabled')
    expect(secure.has('biometric_key_fingerprint')).toBe(false)
    expect(await db.isUnlocked()).toBe(true)
    expect(Object.keys(walletFiles())).toEqual(['default.realm'])
  })
})

describe('final check fixes', () => {
  it('commits a transaction on the copy, syncing it, before the pointer moves', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    const [name] = rekeyedNames()
    const commitAt = mockLog.indexOf(`commit ${name}`)
    expect(commitAt).toBeGreaterThan(mockLog.indexOf(`writeCopyTo ${name}`))
    expect(commitAt).toBeLessThan(mockLog.indexOf(`pointer ${name}`))
  })

  it('keeps the marker when the pointer cannot be read but the same file opens', async () => {
    walletEncryptedWith(REAL_KEY, `${DIR}/wallet-500.realm`)
    secure.set('wallet_file', 'wallet-500.realm')
    secure.set('wallet_key_derivation', 'pbkdf2-sha512')
    enableBiometricsWith(REAL_KEY)
    mockFail.pointerUnreadable = true

    await db.unlockWithBiometrics()

    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
  })

  it('leaves biometrics alone when its status cannot be read after an unlock', async () => {
    walletEncryptedWith(REAL_KEY)
    secure.set('wallet_file', 'default.realm')
    secure.set('biometrics_status', 'enabled')
    secure.set('biometric_key_fingerprint', 'stale')
    mockKeychain.key = 'old key'
    mockFail.biometricsStatusUnreadable = true

    await db.unlock(PASSPHRASE)

    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(storeInBiometricKeychain).not.toHaveBeenCalled()
    expect(resetBiometricKeychain).not.toHaveBeenCalled()
    expect(secure.get('biometrics_status')).toBe('enabled')
    expect(secure.get('biometric_key_fingerprint')).toBe('stale')
    expect(mockKeychain.key).toBe('old key')
  })
})
