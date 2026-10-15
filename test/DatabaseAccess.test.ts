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

const mockFiles = new Map<string, MockFile>()
const mockLog: string[] = []
const mockOpenRealms = new Set<{ path: string; isClosed: boolean }>()
const mockKeychain: { key: string | null } = { key: null }
const mockFail: {
  /** Never finish this step: 'secure:<key>', 'unlink:<file>', 'keychain' */
  hang?: (step: string) => boolean
  writeCopyTo?: boolean
  open?: (path: string, key: string) => boolean
  copyCountOff?: boolean
  pointerWrite?: boolean
  keychainStore?: boolean
} = {}
const mockNever = () => new Promise<never>(() => undefined)

jest.mock('react-native-fs', () => {
  const short = (p: string) => p.replace('/mock/docs/', '')
  return {
    DocumentDirectoryPath: '/mock/docs',
    exists: jest.fn(async (p: string) => mockFiles.has(p)),
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
  for (const r of mockOpenRealms) r.isClosed = true
  for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
  mockLog.length = 0
  mockRealmOpen.mockClear()
}

beforeEach(() => {
  mockFiles.clear()
  mockLog.length = 0
  mockOpenRealms.clear()
  mockKeychain.key = null
  for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
  secure.clear()
  mockRealmOpen.mockClear()
  ;(db as any).realm = null
  ;(db as any).queue = Promise.resolve()
  mockSecureStore.getItemAsync.mockImplementation(
    async (k: string) => secure.get(k) ?? null
  )
  mockSecureStore.setItemAsync.mockImplementation(
    async (k: string, v: string) => {
      if (mockFail.hang?.(`secure:${k}`)) return mockNever()
      if (k === 'wallet_file' && mockFail.pointerWrite) {
        throw new Error('SecureStore failed')
      }
      mockLog.push(`secure ${k}`)
      secure.set(k, v)
    }
  )
  mockSecureStore.deleteItemAsync.mockImplementation(async (k: string) => {
    secure.delete(k)
  })
  ;(storeInBiometricKeychain as jest.Mock)
    .mockReset()
    .mockImplementation(async (key: string) => {
      if (mockFail.hang?.('keychain')) return mockNever()
      if (mockFail.keychainStore) return false
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
  it('opens with the current key and never tries a legacy key', async () => {
    walletEncryptedWith(REAL_KEY)

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('privileged_key_status')).toBe('unlocked')
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
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

  it('skips the legacy derivations for a wrong passphrase once it is known to be current', async () => {
    walletEncryptedWith(REAL_KEY)
    secure.set('wallet_key_derivation', 'pbkdf2-sha512')

    await expect(db.unlock('wrong passphrase')).rejects.toThrow(
      'Realm file decryption failed'
    )

    expect(openedKeys()).toHaveLength(1)
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
    expect(walletFiles()).toEqual({ [name]: REAL_KEY })
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(openedKeys()).toEqual([...tried, REAL_KEY])
    // The old file is deleted only after the pointer has moved.
    const log = mockLog
    expect(log.indexOf(`writeCopyTo ${name}`)).toBeGreaterThan(-1)
    expect(log.indexOf('secure wallet_file')).toBeGreaterThan(
      log.indexOf(`open ${name} ${REAL_KEY.slice(0, 8)}`)
    )
    expect(log.indexOf('unlink default.realm')).toBeGreaterThan(
      log.indexOf('secure wallet_file')
    )
    expect(secure.get('wallet_file')).toBe(name)
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
    // The new file stays open as the wallet; the old one was closed.
    expect(
      [...mockOpenRealms].filter((r) => !r.isClosed).map((r) => r.path)
    ).toEqual([`${DIR}/${name}`])
  })

  it('opens with the current key only after re-keying', async () => {
    walletEncryptedWith(oldKey)
    await db.unlock(PASSPHRASE)
    await db.lock()
    mockRealmOpen.mockClear()

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
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
    expect(currentFile()).toEqual(realmFile(LEGACY_KEY))
    expect(secure.has('wallet_file')).toBe(false)
    expect(secure.get('privileged_key_status')).toBe('unlocked')
    expect(secure.get('privileged_key')).toBe(LEGACY_KEY)
    expect(mockLog).not.toContain('unlink default.realm')

    // The next unlock tries again, and succeeds once nothing fails.
    await db.lock()
    for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
    await db.unlock(PASSPHRASE)
    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(Object.keys(walletFiles())).toHaveLength(1)
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

  it('when writing the pointer fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.pointerWrite = true
    await db.unlock(PASSPHRASE)
    await expectOnLegacyKeyAndIntact()
  })

  it('and puts the old key back in the keychain', async () => {
    walletEncryptedWith(LEGACY_KEY)
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
  async function crashBeforePointer(hang: string) {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.hang = (step) => step === hang
    void db.unlock(PASSPHRASE)
    await settle()
    restart()
  }

  it('the old file is still current and a passphrase unlock re-keys again', async () => {
    await crashBeforePointer('secure:wallet_file')
    const [orphan] = rekeyedNames()
    expect(walletFiles()).toEqual({
      'default.realm': LEGACY_KEY,
      [orphan]: REAL_KEY
    })
    expect(await db.isInitialized()).toBe(true)

    await db.unlock(PASSPHRASE)

    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(Object.keys(walletFiles())).toHaveLength(1)
  })

  it('biometrics, keychain already holding the new key: adopts the new file', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    mockFail.hang = (step) => step === 'secure:wallet_file'
    void db.unlock(PASSPHRASE)
    await settle()
    restart()
    expect(mockKeychain.key).toBe(REAL_KEY)
    expect(secure.has('biometric_key_fingerprint')).toBe(false)

    await db.unlockWithBiometrics()

    const [name] = rekeyedNames()
    expect(secure.get('wallet_file')).toBe(name)
    expect(walletFiles()).toEqual({ [name]: REAL_KEY })
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('biometric_key_fingerprint')).toBe(fingerprint(REAL_KEY))
    expect(secure.get('wallet_key_derivation')).toBe('pbkdf2-sha512')
  })

  it('biometrics, keychain still holding the old key: opens the old file', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    mockFail.hang = (step) => step === 'keychain'
    void db.unlock(PASSPHRASE)
    await settle()
    restart()
    expect(mockKeychain.key).toBe(LEGACY_KEY)

    await db.unlockWithBiometrics()

    expect(walletFiles()).toEqual({ 'default.realm': LEGACY_KEY })
    expect(secure.get('privileged_key')).toBe(LEGACY_KEY)
    expect(secure.get('biometric_key_fingerprint')).toBe(
      fingerprint(LEGACY_KEY)
    )
  })
})

describe('crash after the pointer write, before the old file is deleted', () => {
  async function crashAfterPointer() {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.hang = (step) => step === 'unlink:default.realm'
    void db.unlock(PASSPHRASE)
    await settle()
    restart()
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

describe('pointer naming a missing file', () => {
  it('falls back to default.realm and repairs the pointer', async () => {
    walletEncryptedWith(REAL_KEY)
    secure.set('wallet_file', 'wallet-123.realm')

    expect(await db.isInitialized()).toBe(true)
    await db.unlock(PASSPHRASE)

    expect(secure.get('wallet_file')).toBe('default.realm')
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
  })

  it('falls back to the newest re-keyed file when default.realm is gone', async () => {
    walletEncryptedWith(REAL_KEY, `${DIR}/wallet-200.realm`)
    mockFiles.set(`${DIR}/wallet-100.realm`, realmFile(LEGACY_KEY))
    secure.set('wallet_file', 'wallet-300.realm')

    await db.unlock(PASSPHRASE)

    expect(secure.get('wallet_file')).toBe('wallet-200.realm')
    expect(walletFiles()).toEqual({ 'wallet-200.realm': REAL_KEY })
  })
})

describe('unlock: biometric keychain', () => {
  it('stores the new key before the switch when biometrics is on', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    expect(mockLog.indexOf('keychain store')).toBeLessThan(
      mockLog.indexOf('secure wallet_file')
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

  it('switches anyway, and turns biometrics off, if the new key cannot be stored', async () => {
    walletEncryptedWith(LEGACY_KEY)
    enableBiometricsWith(LEGACY_KEY)
    mockFail.keychainStore = true

    await db.unlock(PASSPHRASE)

    expect(currentFile()).toEqual(realmFile(REAL_KEY))
    expect(secure.get('biometrics_status')).toBe('disabled')
    expect(secure.has('biometric_key_fingerprint')).toBe(false)
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

    expect(mockLog.indexOf('keychain read')).toBeLessThan(
      mockLog.indexOf('secure wallet_file')
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

  it('drops a pointer to a file that is gone', async () => {
    secure.set('wallet_file', 'wallet-123.realm')

    await db.initialize(PASSPHRASE)

    expect(secure.has('wallet_file')).toBe(false)
    expect(Object.keys(walletFiles())).toEqual(['default.realm'])
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
    expect(mockLog.indexOf('secure privileged_key_status')).toBeLessThan(
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
