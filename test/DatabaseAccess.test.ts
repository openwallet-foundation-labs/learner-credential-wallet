/**
 * Unlock, re-key and initialize in DatabaseAccess, with the real key
 * derivations and an in-memory stand-in for Realm and the file system.
 * A "realm file" here records which key encrypts it and how many records it
 * holds; Realm.open fails unless given that key.
 */
import * as nodeCrypto from 'node:crypto'
import * as SecureStore from 'expo-secure-store'
import Realm from 'realm'
import { db } from '../app/model/DatabaseAccess'
import {
  retrieveFromBiometricKeychain,
  storeInBiometricKeychain
} from '../app/lib/biometrics'
import { legacyPlaceholderPbkdf2 } from '../app/lib/legacyPlaceholderPbkdf2'

jest.unmock('crypto')
jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((array: Uint8Array) =>
    require('node:crypto').getRandomValues(array)
  )
}))

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
const mockFail: {
  writeCopyTo?: boolean
  moveFile?: (from: string, to: string) => boolean
  open?: (path: string, key: string) => boolean
  copyCountOff?: boolean
} = {}

jest.mock('react-native-fs', () => {
  const short = (p: string) => p.replace('/mock/docs/', '')
  return {
    DocumentDirectoryPath: '/mock/docs',
    exists: jest.fn(async (p: string) => mockFiles.has(p)),
    readFile: jest.fn(async (p: string) => {
      const file = mockFiles.get(p)
      if (file?.kind !== 'text') throw new Error(`ENOENT ${p}`)
      return file.text
    }),
    writeFile: jest.fn(async (p: string, text: string) => {
      mockFiles.set(p, { kind: 'text', text })
    }),
    unlink: jest.fn(async (p: string) => {
      if (!mockFiles.has(p)) throw new Error(`ENOENT ${p}`)
      mockLog.push(`unlink ${short(p)}`)
      mockFiles.delete(p)
    }),
    moveFile: jest.fn(async (from: string, to: string) => {
      mockLog.push(`move ${short(from)} -> ${short(to)}`)
      if ([...mockOpenRealms].some((r) => r.path === from && !r.isClosed)) {
        throw new Error(`moving ${from} while it is open`)
      }
      if (mockFail.moveFile?.(from, to)) throw new Error('move failed')
      if (!mockFiles.has(from)) throw new Error(`ENOENT ${from}`)
      if (mockFiles.has(to)) throw new Error(`EEXIST ${to}`)
      mockFiles.set(to, mockFiles.get(from) as MockFile)
      mockFiles.delete(from)
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

const WALLET = '/mock/docs/default.realm'
const SALT_PATH = '/mock/docs/edu-wallet-salt'
const SALT = '�\u0007salt�é\u001b'
const PASSPHRASE = 'correct horse battery staple'
const COUNTS = { CredentialRecord: 5, DidRecord: 2, ProfileRecord: 2 }

// 2.2.5 derived the key with OpenSSL (react-native-quick-crypto): Node is the
// reference. 2.2.6-2.2.10 used the placeholder.
const REAL_KEY = nodeCrypto
  .pbkdf2Sync(PASSPHRASE, SALT, 10000, 32, 'sha512')
  .toString('hex')
const LEGACY_KEY = Buffer.from(
  legacyPlaceholderPbkdf2(PASSPHRASE, SALT, 10000, 32)
).toString('hex')

function walletEncryptedWith(key: string) {
  mockFiles.set(SALT_PATH, { kind: 'text', text: SALT })
  mockFiles.set(WALLET, {
    kind: 'realm',
    key,
    schemaVersion: 4,
    counts: { ...COUNTS }
  })
}

function wallet(): MockRealmFile {
  return mockFiles.get(WALLET) as MockRealmFile
}

function rekeyLeftovers(): string[] {
  return [...mockFiles.keys()].filter(
    (p) => p.includes('.rekey') || p.includes('.legacy-backup')
  )
}

function openedKeys(): string[] {
  return mockRealmOpen.mock.calls.map(([config]) =>
    String.fromCharCode(...Array.from(config.encryptionKey as Int8Array))
  )
}

beforeEach(() => {
  mockFiles.clear()
  mockLog.length = 0
  mockOpenRealms.clear()
  for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
  secure.clear()
  mockRealmOpen.mockClear()
  ;(db as any).realm = null
  mockSecureStore.getItemAsync.mockImplementation(
    async (k: string) => secure.get(k) ?? null
  )
  mockSecureStore.setItemAsync.mockImplementation(
    async (k: string, v: string) => {
      mockLog.push(`secure ${k}`)
      secure.set(k, v)
    }
  )
  ;(storeInBiometricKeychain as jest.Mock).mockReset()
  ;(retrieveFromBiometricKeychain as jest.Mock).mockReset()
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  ;(console.error as jest.Mock).mockRestore()
})

it('uses distinct real and legacy keys for the test passphrase', () => {
  expect(REAL_KEY).toMatch(/^[0-9a-f]{64}$/)
  expect(LEGACY_KEY).toMatch(/^[0-9a-f]{64}$/)
  expect(REAL_KEY).not.toBe(LEGACY_KEY)
})

describe('unlock: wallet set up on 2.2.5 or earlier (PBKDF2 key)', () => {
  it('opens with the PBKDF2 key and never tries the legacy key', async () => {
    walletEncryptedWith(REAL_KEY)

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(secure.get('privileged_key_status')).toBe('unlocked')
    expect(mockLog).not.toContainEqual(expect.stringMatching(/writeCopyTo/))
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

describe('unlock: wallet set up on 2.2.6-2.2.10 (placeholder key)', () => {
  it('tries the PBKDF2 key first, then the legacy key, then re-keys', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    expect(mockLog).toEqual([
      `open default.realm ${REAL_KEY.slice(0, 8)}`,
      `open default.realm ${LEGACY_KEY.slice(0, 8)}`,
      'writeCopyTo default.realm.rekey',
      `open default.realm.rekey ${REAL_KEY.slice(0, 8)}`,
      'close default.realm.rekey',
      'close default.realm',
      'move default.realm -> default.realm.legacy-backup',
      'move default.realm.rekey -> default.realm',
      `open default.realm ${REAL_KEY.slice(0, 8)}`,
      'close default.realm',
      'unlink default.realm.rekey.lock',
      'unlink default.realm.legacy-backup',
      `open default.realm ${REAL_KEY.slice(0, 8)}`,
      'secure privileged_key_status',
      'secure privileged_key'
    ])
    expect(wallet()).toEqual({
      kind: 'realm',
      key: REAL_KEY,
      schemaVersion: 4,
      counts: COUNTS
    })
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
    expect(rekeyLeftovers()).toEqual([])
  })

  it('opens with the PBKDF2 key only after re-keying', async () => {
    walletEncryptedWith(LEGACY_KEY)
    await db.unlock(PASSPHRASE)
    await db.lock()
    mockRealmOpen.mockClear()

    await db.unlock(PASSPHRASE)

    expect(openedKeys()).toEqual([REAL_KEY])
  })

  it('stores the new key in the biometric keychain when biometrics is on', async () => {
    walletEncryptedWith(LEGACY_KEY)
    secure.set('biometrics_status', 'enabled')

    await db.unlock(PASSPHRASE)

    expect(storeInBiometricKeychain).toHaveBeenCalledWith(REAL_KEY)
    expect(secure.get('biometrics_status')).toBe('enabled')
  })

  it('leaves the biometric keychain alone when biometrics is off', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    expect(storeInBiometricKeychain).not.toHaveBeenCalled()
  })

  it('turns biometrics off if the biometric key cannot be updated', async () => {
    walletEncryptedWith(LEGACY_KEY)
    secure.set('biometrics_status', 'enabled')
    ;(storeInBiometricKeychain as jest.Mock).mockRejectedValue(
      new Error('keychain')
    )

    await db.unlock(PASSPHRASE)

    expect(secure.get('biometrics_status')).toBe('disabled')
    expect(secure.get('privileged_key')).toBe(REAL_KEY)
  })
})

describe('unlock: re-key failures leave the original wallet openable', () => {
  async function expectUnlockedWithLegacyKeyAndIntact() {
    expect(wallet()).toEqual({
      kind: 'realm',
      key: LEGACY_KEY,
      schemaVersion: 4,
      counts: COUNTS
    })
    expect(secure.get('privileged_key_status')).toBe('unlocked')
    expect(secure.get('privileged_key')).toBe(LEGACY_KEY)
    expect(rekeyLeftovers()).toEqual([])
    expect(storeInBiometricKeychain).not.toHaveBeenCalled()

    // The next unlock tries again, and succeeds once nothing fails.
    await db.lock()
    for (const k of Object.keys(mockFail)) delete (mockFail as any)[k]
    await db.unlock(PASSPHRASE)
    expect(wallet().key).toBe(REAL_KEY)
    expect(wallet().counts).toEqual(COUNTS)
    expect(rekeyLeftovers()).toEqual([])
  }

  it('when writing the copy fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.writeCopyTo = true

    await db.unlock(PASSPHRASE)

    await expectUnlockedWithLegacyKeyAndIntact()
  })

  it('when the copy does not open with the new key', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.open = (path) => path.endsWith('.rekey')

    await db.unlock(PASSPHRASE)

    await expectUnlockedWithLegacyKeyAndIntact()
  })

  it('when the copy holds a different number of records', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.copyCountOff = true

    await db.unlock(PASSPHRASE)

    await expectUnlockedWithLegacyKeyAndIntact()
  })

  it('when moving the wallet aside fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.moveFile = (from) => from === WALLET

    await db.unlock(PASSPHRASE)

    await expectUnlockedWithLegacyKeyAndIntact()
  })

  it('when moving the copy into place fails', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.moveFile = (from) => from.endsWith('.rekey')

    await db.unlock(PASSPHRASE)

    expect(mockLog).toContain(
      'move default.realm.legacy-backup -> default.realm'
    )
    await expectUnlockedWithLegacyKeyAndIntact()
  })

  it('when the swapped-in copy does not open', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFail.open = (path, key) => path === WALLET && key === REAL_KEY

    await db.unlock(PASSPHRASE)

    expect(mockLog).toContain('unlink default.realm')
    expect(mockLog).toContain(
      'move default.realm.legacy-backup -> default.realm'
    )
    await expectUnlockedWithLegacyKeyAndIntact()
  })

  it('when the app stopped between the two moves', async () => {
    // State after "move default.realm -> default.realm.legacy-backup"
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${WALLET}.legacy-backup`, wallet())
    mockFiles.delete(WALLET)
    mockFiles.set(`${WALLET}.rekey`, {
      kind: 'realm',
      key: REAL_KEY,
      schemaVersion: 4,
      counts: { ...COUNTS }
    })

    expect(await db.isInitialized()).toBe(true)
    expect(wallet().key).toBe(LEGACY_KEY)

    await db.unlock(PASSPHRASE)

    expect(wallet()).toEqual({
      kind: 'realm',
      key: REAL_KEY,
      schemaVersion: 4,
      counts: COUNTS
    })
    expect(rekeyLeftovers()).toEqual([])
  })
})

describe('unlock: failures', () => {
  it('rejects a wrong passphrase with the PBKDF2 attempt error and changes nothing', async () => {
    walletEncryptedWith(LEGACY_KEY)

    await expect(db.unlock('wrong passphrase')).rejects.toThrow(
      'Realm file decryption failed'
    )

    expect(openedKeys()).toHaveLength(2)
    expect(wallet().key).toBe(LEGACY_KEY)
    expect(await db.isUnlocked()).toBe(false)
    expect(mockLog).not.toContainEqual(expect.stringMatching(/writeCopyTo/))
  })

  it('never creates a wallet that is not there', async () => {
    mockFiles.set(SALT_PATH, { kind: 'text', text: SALT })

    await expect(db.unlock(PASSPHRASE)).rejects.toThrow(
      'Wallet database not found.'
    )

    expect(mockRealmOpen).not.toHaveBeenCalled()
    expect(mockFiles.has(WALLET)).toBe(false)
  })
})

describe('initialize', () => {
  it('creates the wallet with the PBKDF2 key only', async () => {
    secure.set('privileged_key_status', 'locked')
    const legacy = jest.spyOn(
      require('../app/lib/legacyPlaceholderPbkdf2'),
      'legacyPlaceholderPbkdf2'
    )

    await db.initialize(PASSPHRASE)

    const salt = (mockFiles.get(SALT_PATH) as { text: string }).text
    const expected = nodeCrypto
      .pbkdf2Sync(PASSPHRASE, salt, 10000, 32, 'sha512')
      .toString('hex')
    expect(openedKeys()).toEqual([expected])
    expect(wallet().key).toBe(expected)
    expect(legacy).not.toHaveBeenCalled()
    expect(await db.isUnlocked()).toBe(false)

    await db.unlock(PASSPHRASE)
    expect(secure.get('privileged_key')).toBe(expected)
    legacy.mockRestore()
  })
})

describe('lock', () => {
  it('closes the open Realm', async () => {
    walletEncryptedWith(REAL_KEY)
    await db.unlock(PASSPHRASE)
    const open = [...mockOpenRealms].filter((r) => !r.isClosed)
    expect(open).toHaveLength(1)

    await db.lock()

    expect(open[0].isClosed).toBe(true)
  })
})

describe('unlockWithBiometrics', () => {
  it('opens with the key from the biometric keychain', async () => {
    walletEncryptedWith(LEGACY_KEY)
    secure.set('biometrics_status', 'enabled')
    ;(retrieveFromBiometricKeychain as jest.Mock).mockResolvedValue(LEGACY_KEY)

    await db.unlockWithBiometrics()

    expect(openedKeys()).toEqual([LEGACY_KEY])
    expect(await db.isUnlocked()).toBe(true)
  })
})

describe('reset', () => {
  it('removes a re-key backup so it cannot come back later', async () => {
    walletEncryptedWith(LEGACY_KEY)
    mockFiles.set(`${WALLET}.legacy-backup`, wallet())
    for (const s of ['.lock', '.note', '.management']) {
      mockFiles.set(`${WALLET}${s}`, { kind: 'text', text: '' })
    }

    await db.reset()

    expect(mockFiles.has(WALLET)).toBe(false)
    expect(rekeyLeftovers()).toEqual([])
    expect(await db.isInitialized()).toBe(false)
  })
})
