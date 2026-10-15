import Realm from 'realm'
import * as SecureStore from 'expo-secure-store'
import * as RNFS from 'react-native-fs'
import * as encoding from 'text-encoding'
import { generateSecureRandom } from 'react-native-securerandom'

import {
  resetBiometricKeychain,
  retrieveFromBiometricKeychain,
  storeInBiometricKeychain
} from '../lib/biometrics'
import {
  deriveLegacyKeyHex,
  deriveWalletKeyHex,
  KeyDerivation,
  LEGACY_KEY_DERIVATIONS,
  walletKeyFingerprint
} from '../lib/walletKey'
import { runMigrations, schemaVersion } from './migration'

// Models will be loaded dynamically to avoid circular dependencies
let models: Realm.ObjectClass[] | null = null

async function getModels(): Promise<Realm.ObjectClass[]> {
  if (models === null) {
    const { CredentialRecord } = await import('./credential')
    const { DidRecord } = await import('./did')
    const { ProfileRecord } = await import('./profile')
    models = [CredentialRecord, DidRecord, ProfileRecord]
  }
  return models
}

const PRIVILEGED_KEY_KID = 'privileged_key'
const PRIVILEGED_KEY_STATUS_ID = 'privileged_key_status'
const UNLOCKED = 'unlocked'
const LOCKED = 'locked'

const BIOMETRICS_STATUS = 'biometrics_status'
const ENABLED = 'enabled'
const DISABLED = 'disabled'
/**
 * walletKeyFingerprint of the key in the biometric keychain. It is only ever
 * set to a key that opens the current wallet file; absent means unknown.
 */
const BIOMETRIC_KEY_FINGERPRINT = 'biometric_key_fingerprint'

/**
 * The KeyDerivation that last opened the wallet, whenever that is known.
 * Absent means unknown (for example, a wallet only ever unlocked with
 * biometrics since this was added). Lets a follow-up find wallets still on a
 * legacy key.
 */
const WALLET_KEY_DERIVATION = 'wallet_key_derivation'

/**
 * The name of the current wallet file, in the directory of
 * Realm.defaultPath. Absent means Realm.defaultPath. Re-keying writes a new
 * file and switches to it by changing this one value, so no wallet file is
 * ever moved or overwritten.
 */
const WALLET_FILE = 'wallet_file'

const PBKDF2_SALT_PATH = `${RNFS.DocumentDirectoryPath}/edu-wallet-salt`

/** Every path a wallet file can have, in one place. */
const walletFiles = {
  dir(): string {
    return Realm.defaultPath.slice(0, Realm.defaultPath.lastIndexOf('/'))
  },
  /** The file a WALLET_FILE value names. */
  pathFor(name: string | null): string {
    return name ? `${walletFiles.dir()}/${name}` : Realm.defaultPath
  },
  nameOf(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1)
  },
  /** A file written by a re-key: wallet-<timestamp>.realm */
  isRekeyedName(name: string): boolean {
    return /^wallet-\d+\.realm$/.test(name)
  },
  /** A re-keyed file, or one of its side files */
  isRekeyedFileName(name: string): boolean {
    return /^wallet-\d+\.realm(\.lock|\.note|\.management)?$/.test(name)
  },
  sideFiles(path: string): string[] {
    return ['.lock', '.note', '.management'].map((s) => path + s)
  }
}

/** Realm's 64-byte encryption key is the ASCII of the 64-character hex key. */
function realmKeyFromHex(keyHex: string): Int8Array {
  const encoder = new encoding.TextEncoder()
  const encodedBytes = new Int8Array(encoder.encode(keyHex))
  return encodedBytes.slice(0, 64)
}

function assertSameContents(original: Realm, copy: Realm): void {
  if (copy.schemaVersion !== original.schemaVersion) {
    throw new Error('Re-keyed copy has a different schema version.')
  }
  for (const { name } of original.schema) {
    if (copy.objects(name).length !== original.objects(name).length) {
      throw new Error(`Re-keyed copy has a different number of ${name}.`)
    }
  }
}

/** Deletes the files that exist; a missing one is not an error. */
async function removeFiles(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      if (await RNFS.exists(path)) await RNFS.unlink(path)
    })
  )
}

/** Deletes a Realm file and its side files, where they exist. */
async function removeRealmFiles(path: string): Promise<void> {
  await removeFiles([path, ...walletFiles.sideFiles(path)])
}

/** Every wallet file that exists: Realm.defaultPath and re-keyed files. */
async function existingWalletPaths(): Promise<string[]> {
  const [hasDefault, entries] = await Promise.all([
    RNFS.exists(Realm.defaultPath),
    RNFS.readDir(walletFiles.dir())
  ])
  const rekeyed = entries
    .filter((entry) => walletFiles.isRekeyedName(entry.name))
    .map((entry) => entry.path)
  return hasDefault ? [Realm.defaultPath, ...rekeyed] : rekeyed
}

/** The re-keyed file with the latest timestamp. */
function newest(paths: string[]): string {
  const stamp = (p: string) => Number(/(\d+)\.realm$/.exec(p)?.[1] ?? 0)
  return [...paths].sort((a, b) => stamp(b) - stamp(a))[0]
}

type OpenOptions = {
  /** Create the file if it does not exist. Only for initialize. */
  create?: boolean
  onMigration?: Realm.MigrationCallback
}

type Opened = { realm: Realm; keyHex: string }

class DatabaseAccess {
  /**
   * Everything that opens, closes, re-keys or deletes the wallet runs one at
   * a time, in call order: a double tap on Unlock, biometrics racing a
   * passphrase, or withInstance during a lock must not interleave. Code
   * running inside `exclusive` calls the *Exclusive variants, never the
   * public ones, which would wait for themselves.
   */
  private static queue: Promise<unknown> = Promise.resolve()

  private static exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = DatabaseAccess.queue.then(task)
    DatabaseAccess.queue = run.catch(() => undefined)
    return run
  }

  /**
   * Do not store off the instance from withInstance for any reason. If you need
   * to do work on the database, do all of it within the callback to withInstance.
   */
  public static async withInstance<T>(
    callback: (instance: Realm) => T | Promise<T>
  ): Promise<T> {
    const database = await DatabaseAccess.instance()

    return callback(database)
  }

  public static async isUnlocked(): Promise<boolean> {
    try {
      const keyStatus = await SecureStore.getItemAsync(PRIVILEGED_KEY_STATUS_ID)

      return keyStatus === UNLOCKED
    } catch (err) {
      console.error(err)
      return false
    }
  }

  public static async isBiometricsEnabled(): Promise<boolean> {
    const biometricsStatus = await SecureStore.getItemAsync(BIOMETRICS_STATUS)
    return biometricsStatus === ENABLED
  }

  /**
   * Opens the wallet with the key in the biometric keychain. The OS prompt
   * runs before taking the lock, so it holds nothing else up.
   *
   * A re-key stores the new key in the keychain just before switching to the
   * new file. If the app stopped in between, the key opens that file rather
   * than the current one, and that file becomes current.
   */
  public static async unlockWithBiometrics(): Promise<void> {
    if (!(await DatabaseAccess.isBiometricsEnabled())) {
      throw new Error('Biometric authentication is not enabled.')
    }

    const keyHex = await retrieveFromBiometricKeychain()

    return DatabaseAccess.exclusive(async () => {
      if (await DatabaseAccess.isUnlocked()) return

      const { path, fallback } = await DatabaseAccess.resolveWalletPath()
      let realm: Realm
      let switched = false
      try {
        realm = await DatabaseAccess.open(keyHex, path)
      } catch (err) {
        const orphan = await DatabaseAccess.openOrphan(keyHex, path)
        if (orphan === null) throw err
        realm = orphan
        switched = true
      }

      await DatabaseAccess.adopt(
        { realm, keyHex },
        {
          writePointer: fallback || switched,
          // Re-keyed files are only ever written with the current key.
          derivation: switched ? 'pbkdf2-sha512' : undefined
        }
      )
      // The keychain key has just opened the current file.
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(keyHex)
      ).catch(console.error)
    })
  }

  /** Leaves biometrics off if the key cannot be stored in the keychain. */
  public static enableBiometrics(): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

      if (!key) {
        throw new Error('The wallet must be unlocked to enable biometrics')
      }

      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
      if (!(await storeInBiometricKeychain(key))) {
        console.error('Could not store the key; biometrics stays off.')
        return
      }
      await SecureStore.setItemAsync(BIOMETRICS_STATUS, ENABLED)
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(key)
      )
    })
  }

  public static disableBiometrics(): Promise<void> {
    return DatabaseAccess.exclusive(() =>
      DatabaseAccess.disableBiometricsExclusive()
    )
  }

  private static async disableBiometricsExclusive(): Promise<void> {
    await resetBiometricKeychain()
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, DISABLED)
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
  }

  /**
   * This generates the key to unlock the wallet and stores it
   * in SecureStorage. Please adhere to these guidelines:
   *   1. Never store/persist the passphrase. It should only exist in input an
   *      the variable passed to this function.
   *   2. Never store the key generated in any place but SecureStorage
   *
   * The wallet is opened with the current key (PBKDF2-SHA512) first, then
   * with each legacy key in LEGACY_KEY_DERIVATIONS (see walletKey.ts and
   * issue #960). If a legacy key opens it, it is re-encrypted with the current
   * key (see rekey). If that fails, the wallet stays on the legacy key and
   * re-encryption is tried again at the next unlock.
   */
  public static unlock(passphrase: string): Promise<void> {
    return DatabaseAccess.exclusive(() =>
      DatabaseAccess.unlockExclusive(passphrase)
    )
  }

  private static async unlockExclusive(passphrase: string): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) return

    const salt = await DatabaseAccess.salt()
    const keyHex = deriveWalletKeyHex(passphrase, salt)
    const { path, fallback } = await DatabaseAccess.resolveWalletPath()

    let opened: Opened
    let derivation: KeyDerivation = 'pbkdf2-sha512'
    let legacy: Opened | undefined = undefined
    try {
      opened = { realm: await DatabaseAccess.open(keyHex, path), keyHex }
    } catch (err) {
      // A wallet known to be on the current key needs no legacy
      // derivations: this is a wrong passphrase.
      const marker = await SecureStore.getItemAsync(WALLET_KEY_DERIVATION)
      if (marker === 'pbkdf2-sha512' && !fallback) throw err

      let found: Opened & { derivation: KeyDerivation }
      try {
        found = await DatabaseAccess.openWithLegacyKey(passphrase, salt, path)
      } catch {
        // No key opens it: report the current key's error, as before.
        throw err
      }
      opened = legacy = found
      derivation = found.derivation
    }

    if (fallback) {
      try {
        await DatabaseAccess.writePointer(path)
      } catch (err) {
        opened.realm.close()
        throw err
      }
    }
    // The current file opened and the pointer names it, so any other wallet
    // file was left by an interrupted re-key.
    await DatabaseAccess.removeOrphans(path)

    if (legacy !== undefined) {
      const rekeyed = await DatabaseAccess.rekey(legacy, keyHex)
      if (rekeyed !== null) {
        opened = { realm: rekeyed, keyHex }
        derivation = 'pbkdf2-sha512'
      }
    }

    await DatabaseAccess.adopt(opened, { writePointer: false, derivation })
    await DatabaseAccess.refreshBiometricKey(opened.keyHex)
  }

  /** Tries each legacy derivation in turn; throws if none opens the file. */
  private static async openWithLegacyKey(
    passphrase: string,
    salt: string,
    path: string
  ): Promise<Opened & { derivation: KeyDerivation }> {
    for (const derivation of LEGACY_KEY_DERIVATIONS) {
      const keyHex = deriveLegacyKeyHex(derivation, passphrase, salt)
      try {
        const realm = await DatabaseAccess.open(keyHex, path)
        return { realm, keyHex, derivation }
      } catch {
        // Try the next one
      }
    }
    throw new Error('No legacy key opens the wallet.')
  }

  /**
   * Makes `realm` the open wallet and records the unlocked state, first
   * pointing WALLET_FILE at it if asked. On failure nothing is left unlocked.
   * Then deletes any other wallet file: this one has opened and the pointer
   * names it.
   */
  private static async adopt(
    { realm, keyHex }: Opened,
    {
      writePointer,
      derivation
    }: { writePointer: boolean; derivation?: KeyDerivation }
  ): Promise<void> {
    try {
      if (writePointer) await DatabaseAccess.writePointer(realm.path)
      DatabaseAccess.setRealm(realm)
      await Promise.all([
        SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
        SecureStore.setItemAsync(PRIVILEGED_KEY_KID, keyHex)
      ])
    } catch (err) {
      DatabaseAccess.closeRealm()
      if (!realm.isClosed) realm.close()
      await DatabaseAccess.clearUnlockedState()
      throw err
    }

    await DatabaseAccess.removeOrphans(realm.path)
    if (derivation !== undefined) {
      await SecureStore.setItemAsync(WALLET_KEY_DERIVATION, derivation).catch(
        console.error
      )
    }
  }

  public static lock(): Promise<void> {
    return DatabaseAccess.exclusive(() => DatabaseAccess.lockExclusive())
  }

  private static async lockExclusive(): Promise<void> {
    if (!(await DatabaseAccess.isUnlocked())) return

    // Mark it locked first, so nothing reopens it once it is closed.
    try {
      await Promise.all([
        SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
        SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
      ])
    } finally {
      DatabaseAccess.closeRealm()
    }
  }

  /**
   * True if any wallet file exists. Changes nothing, so it does not wait for
   * an unlock in progress.
   */
  public static async isInitialized(): Promise<boolean> {
    return (await existingWalletPaths()).length > 0
  }

  /**
   * WARNING: Calling these two functions are destructive. They will wipe out the
   * existing salt and database.
   */
  public static reset(): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      if (await DatabaseAccess.isUnlocked()) {
        throw new Error('Cannot reset unlocked wallet.')
      }

      await DatabaseAccess.disableBiometricsExclusive()

      const entries = await RNFS.readDir(walletFiles.dir())
      await Promise.all([
        removeRealmFiles(Realm.defaultPath),
        removeFiles(
          entries
            .filter((entry) => walletFiles.isRekeyedFileName(entry.name))
            .map((entry) => entry.path)
        )
      ])
      await SecureStore.deleteItemAsync(WALLET_FILE)
      await SecureStore.deleteItemAsync(WALLET_KEY_DERIVATION)
    })
  }

  /**
   * Creates the wallet and leaves it unlocked, so that the unlock that
   * follows during onboarding does not derive the key a second time.
   */
  public static initialize(passphrase: string): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      if (await DatabaseAccess.isUnlocked()) {
        throw new Error('Cannot initialize unlocked wallet.')
      }

      if ((await existingWalletPaths()).length > 0) {
        throw new Error('Wallet must be in reset state to be initialized')
      }
      // A pointer to a file that is gone means nothing now.
      await SecureStore.deleteItemAsync(WALLET_FILE)
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)

      const decoder = new encoding.TextDecoder()
      const rawSalt = await generateSecureRandom(64)
      const salt: string = decoder.decode(rawSalt)

      await RNFS.writeFile(PBKDF2_SALT_PATH, salt, 'utf8')

      // Create the Realm with the current key only. Read the salt back as
      // unlock will, so both derive the key from the same string.
      const keyHex = deriveWalletKeyHex(passphrase, await DatabaseAccess.salt())
      const realm = await DatabaseAccess.open(keyHex, Realm.defaultPath, {
        create: true
      })
      await DatabaseAccess.adopt(
        { realm, keyHex },
        { writePointer: false, derivation: 'pbkdf2-sha512' }
      )
    })
  }

  private static async salt(): Promise<string> {
    return RNFS.readFile(PBKDF2_SALT_PATH, 'utf8')
  }

  /**
   * The current wallet file. If the pointer names a file that is gone, falls
   * back to Realm.defaultPath, or else the newest re-keyed file that exists,
   * and logs it. The pointer is only rewritten once that file has opened.
   */
  private static async resolveWalletPath(): Promise<{
    path: string
    fallback: boolean
  }> {
    const pointed = walletFiles.pathFor(
      await SecureStore.getItemAsync(WALLET_FILE)
    )
    if (await RNFS.exists(pointed)) return { path: pointed, fallback: false }

    const existing = await existingWalletPaths()
    if (existing.length === 0) return { path: pointed, fallback: false }

    const path = existing.includes(Realm.defaultPath)
      ? Realm.defaultPath
      : newest(existing)
    console.error(`Wallet file ${pointed} is missing; trying ${path}.`)
    return { path, fallback: true }
  }

  /** Switches the current wallet file, in one SecureStore write. */
  private static async writePointer(path: string): Promise<void> {
    await SecureStore.setItemAsync(WALLET_FILE, walletFiles.nameOf(path))
  }

  /**
   * Deletes every wallet file but `current`. Only call this once `current`
   * has opened and the pointer names it.
   */
  private static async removeOrphans(current: string): Promise<void> {
    try {
      const orphans = (await existingWalletPaths()).filter((p) => p !== current)
      await Promise.all(orphans.map((p) => removeRealmFiles(p)))
    } catch (err) {
      console.error('Could not remove old wallet files:', err)
    }
  }

  /** Opens the first wallet file other than `current` that `keyHex` opens. */
  private static async openOrphan(
    keyHex: string,
    current: string
  ): Promise<Realm | null> {
    const orphans = (await existingWalletPaths()).filter((p) => p !== current)
    for (const path of orphans) {
      try {
        return await DatabaseAccess.open(keyHex, path)
      } catch {
        // Try the next one
      }
    }
    return null
  }

  /**
   * Opens a wallet file with the given hex key. Throws if the file does not
   * exist, unless `create` is set, so that a missing wallet is never silently
   * replaced by an empty one.
   */
  private static async open(
    keyHex: string,
    path: string,
    { create = false, onMigration }: OpenOptions = {}
  ): Promise<Realm> {
    if (!create && !(await RNFS.exists(path))) {
      throw new Error('Wallet database not found.')
    }

    return Realm.open({
      path,
      schema: await getModels(),
      schemaVersion,
      onMigration: onMigration ?? runMigrations,
      encryptionKey: realmKeyFromHex(keyHex)
    })
  }

  /**
   * Re-encrypts the wallet that `legacy` has open with `keyHex`. Returns the
   * new file, open, or null if the wallet stays as it was (and `legacy.realm`
   * stays open).
   *
   * 1. Write an encrypted copy to a new file, wallet-<timestamp>.realm.
   * 2. Check the copy opens with the new key, needs no migration, and holds
   *    the same number of records.
   * 3. If biometrics is on, store the new key in the keychain, so a
   *    biometric unlock can find the new file even if the app stops before
   *    step 4.
   * 4. Point WALLET_FILE at the new file. This one write is the switch.
   * 5. Delete the old file.
   *
   * A failure before step 4 deletes only the new file and puts the old key
   * back in the keychain. The old file is not touched until the pointer has
   * moved, so a crash at any point leaves a current file that opens: before
   * step 4 the old one, after it the new one.
   */
  private static async rekey(
    legacy: Opened,
    keyHex: string
  ): Promise<Realm | null> {
    const oldPath = legacy.realm.path
    const newPath = await DatabaseAccess.newWalletPath()
    const biometrics = await DatabaseAccess.isBiometricsEnabled().catch(
      () => false
    )
    let copy: Realm | null = null
    let keychainTouched = false
    let keychainHasNewKey = false

    try {
      legacy.realm.writeCopyTo({
        path: newPath,
        encryptionKey: realmKeyFromHex(keyHex)
      })
      copy = await DatabaseAccess.open(keyHex, newPath, {
        onMigration: () => {
          throw new Error('Re-keyed copy unexpectedly needs a migration.')
        }
      })
      assertSameContents(legacy.realm, copy)

      if (biometrics) {
        // From here the keychain may hold either key, so the fingerprint
        // must not vouch for either until the switch has happened or not.
        await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
        keychainTouched = true
        keychainHasNewKey = await storeInBiometricKeychain(keyHex).catch(
          () => false
        )
      }

      await DatabaseAccess.writePointer(newPath)
    } catch (err) {
      console.error('Wallet re-key failed; keeping the original key.', err)
      if (copy !== null) copy.close()
      await removeRealmFiles(newPath).catch(console.error)
      if (keychainTouched) await DatabaseAccess.setBiometricKey(legacy.keyHex)
      return null
    }

    // Switched: the new file is current.
    legacy.realm.close()
    await removeRealmFiles(oldPath).catch(console.error)
    if (keychainHasNewKey) {
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(keyHex)
      ).catch(console.error)
    } else if (biometrics) {
      await DatabaseAccess.disableBiometricsExclusive().catch(console.error)
    }
    return copy
  }

  private static async newWalletPath(): Promise<string> {
    for (let stamp = Date.now(); ; stamp++) {
      const path = walletFiles.pathFor(`wallet-${stamp}.realm`)
      if (!(await RNFS.exists(path))) return path
    }
  }

  /**
   * Stores `keyHex`, which opens the current wallet file, in the biometric
   * keychain and records its fingerprint. If that fails, turns biometrics
   * off rather than leave a key that may not open the wallet.
   */
  private static async setBiometricKey(keyHex: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
      if (await storeInBiometricKeychain(keyHex)) {
        await SecureStore.setItemAsync(
          BIOMETRIC_KEY_FINGERPRINT,
          walletKeyFingerprint(keyHex)
        )
        return
      }
      console.error('Could not update the biometric key; disabling.')
    } catch (err) {
      console.error('Could not update the biometric key; disabling.', err)
    }
    await DatabaseAccess.disableBiometricsExclusive().catch(console.error)
  }

  /**
   * Keeps the biometric keychain in step with the key that just opened the
   * current wallet file, after a re-key or an interruption that left it
   * holding another key.
   */
  private static async refreshBiometricKey(keyHex: string): Promise<void> {
    try {
      if (!(await DatabaseAccess.isBiometricsEnabled())) return
      const stored = await SecureStore.getItemAsync(BIOMETRIC_KEY_FINGERPRINT)
      if (stored === walletKeyFingerprint(keyHex)) return
    } catch (err) {
      console.error(err)
    }
    await DatabaseAccess.setBiometricKey(keyHex)
  }

  /** Marks the wallet locked and forgets the key, whatever state it is in. */
  private static async clearUnlockedState(): Promise<void> {
    await Promise.allSettled([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
    ])
  }

  private static realm: Realm | null = null

  /** Replaces the open wallet, closing the previous instance. */
  private static setRealm(realm: Realm): void {
    const previous = DatabaseAccess.realm
    if (previous !== null && previous !== realm && !previous.isClosed) {
      previous.close()
    }
    DatabaseAccess.realm = realm
  }

  private static closeRealm(): void {
    const realm = DatabaseAccess.realm
    DatabaseAccess.realm = null
    if (realm !== null && !realm.isClosed) realm.close()
  }

  /**
   * The open wallet. Opening it (after a restart that kept it unlocked)
   * waits for any unlock, lock, re-key or reset in progress, and refuses if
   * the wallet is not unlocked.
   */
  private static async instance(): Promise<Realm> {
    const open = DatabaseAccess.realm
    if (open !== null && !open.isClosed) return open

    return DatabaseAccess.exclusive(async () => {
      const current = DatabaseAccess.realm
      if (current !== null && !current.isClosed) return current

      if (!(await DatabaseAccess.isUnlocked())) {
        throw new Error('Wallet is not unlocked.')
      }
      const keyHex = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)
      if (!keyHex) {
        throw new Error('Key not present in keychain.')
      }

      const { path, fallback } = await DatabaseAccess.resolveWalletPath()
      const realm = await DatabaseAccess.open(keyHex, path)
      if (fallback) {
        await DatabaseAccess.writePointer(path).catch(console.error)
      }
      DatabaseAccess.setRealm(realm)
      return realm
    })
  }
}

export { models, DatabaseAccess as db }
