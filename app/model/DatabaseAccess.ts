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
/** walletKeyFingerprint of the key last stored in the biometric keychain */
const BIOMETRIC_KEY_FINGERPRINT = 'biometric_key_fingerprint'

/**
 * The KeyDerivation that last opened the wallet with a passphrase. Absent
 * means unknown (for example, a wallet only ever unlocked with biometrics
 * since this was added). Lets a follow-up find wallets still on a legacy key.
 */
const WALLET_KEY_DERIVATION = 'wallet_key_derivation'

const PBKDF2_SALT_PATH = `${RNFS.DocumentDirectoryPath}/edu-wallet-salt`

// Files next to the wallet while it is re-encrypted (see DatabaseAccess.rekey)
const REKEY_COPY_SUFFIX = '.rekey'
const REKEY_BACKUP_SUFFIX = '.legacy-backup'
const REKEY_PARTIAL_SUFFIX = '.rekey-partial'
const REALM_AUX_SUFFIXES = ['.lock', '.note', '.management']

const rekeyCopyPath = (path: string) => `${path}${REKEY_COPY_SUFFIX}`
const rekeyBackupPath = (path: string) => `${path}${REKEY_BACKUP_SUFFIX}`
const rekeyPartialPath = (path: string) => `${path}${REKEY_PARTIAL_SUFFIX}`

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

/** Deletes a Realm file and its side files, where they exist. */
async function removeRealmFiles(base: string): Promise<void> {
  await Promise.all(
    [base, ...REALM_AUX_SUFFIXES.map((s) => base + s)].map(async (file) => {
      if (await RNFS.exists(file)) await RNFS.unlink(file)
    })
  )
}

type OpenOptions = {
  /** Defaults to Realm.defaultPath. */
  path?: string
  /** Create the wallet if the file does not exist. Only for initialize. */
  create?: boolean
  onMigration?: Realm.MigrationCallback
}

class DatabaseAccess {
  /**
   * Unlocking, locking, initializing and resetting move and delete wallet
   * files, so they run one at a time, in call order: a double tap on Unlock,
   * or biometrics racing a passphrase, must not interleave. Code running
   * inside `exclusive` calls the *Exclusive variants, never the public ones,
   * which would wait for themselves.
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

  public static unlockWithBiometrics(): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      if (!(await DatabaseAccess.isBiometricsEnabled())) {
        throw new Error('Biometric authentication is not enabled.')
      }

      await DatabaseAccess.restoreInterruptedRekey()

      const key = await retrieveFromBiometricKeychain()

      // Attempt database decryption to see if key is valid
      try {
        await Promise.all([
          SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
          SecureStore.setItemAsync(PRIVILEGED_KEY_KID, key)
        ])
        await DatabaseAccess.instance()
      } catch (err) {
        DatabaseAccess.closeRealm()
        await DatabaseAccess.clearUnlockedState()

        throw err
      }
    })
  }

  public static async enableBiometrics(): Promise<void> {
    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

    if (key === null) {
      throw new Error('The wallet must be unlocked to enable biometrics')
    }

    const stored = await storeInBiometricKeychain(key)
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, ENABLED)
    // Without a fingerprint, the next passphrase unlock stores the key again.
    if (stored) {
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(key)
      )
    }
  }

  public static async disableBiometrics(): Promise<void> {
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
   * key. If that fails, the wallet stays on the legacy key and re-encryption
   * is tried again at the next unlock.
   */
  public static unlock(passphrase: string): Promise<void> {
    return DatabaseAccess.exclusive(() =>
      DatabaseAccess.unlockExclusive(passphrase)
    )
  }

  private static async unlockExclusive(passphrase: string): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) return

    await DatabaseAccess.restoreInterruptedRekey()

    const salt = await DatabaseAccess.salt()
    const keyHex = deriveWalletKeyHex(passphrase, salt)

    let realm: Realm
    let derivation: KeyDerivation = 'pbkdf2-sha512'
    let openedKeyHex = keyHex
    let legacy:
      | { realm: Realm; derivation: KeyDerivation; keyHex: string }
      | undefined = undefined
    try {
      realm = await DatabaseAccess.open(keyHex)
    } catch (err) {
      try {
        legacy = await DatabaseAccess.openWithLegacyKey(passphrase, salt)
      } catch {
        // No key opens it: report the current key's error, as before.
        throw err
      }
      realm = legacy.realm
    }

    // The wallet opened, so a copy or backup left by an interrupted re-key
    // is redundant (and would be in the way of a new one).
    await DatabaseAccess.removeRekeyLeftovers().catch(console.error)

    if (legacy !== undefined) {
      const result = await DatabaseAccess.rekey(
        legacy.realm,
        legacy.keyHex,
        keyHex
      )
      realm = result.realm
      if (!result.rekeyed) {
        derivation = legacy.derivation
        openedKeyHex = legacy.keyHex
      }
    }

    DatabaseAccess.realm = realm
    try {
      await Promise.all([
        SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
        SecureStore.setItemAsync(PRIVILEGED_KEY_KID, openedKeyHex)
      ])
    } catch (err) {
      DatabaseAccess.closeRealm()
      await DatabaseAccess.clearUnlockedState()

      throw err
    }

    await SecureStore.setItemAsync(WALLET_KEY_DERIVATION, derivation).catch(
      console.error
    )
    await DatabaseAccess.refreshBiometricKey(openedKeyHex)
  }

  /** Tries each legacy derivation in turn; throws if none opens the wallet. */
  private static async openWithLegacyKey(
    passphrase: string,
    salt: string
  ): Promise<{ realm: Realm; derivation: KeyDerivation; keyHex: string }> {
    for (const derivation of LEGACY_KEY_DERIVATIONS) {
      const keyHex = deriveLegacyKeyHex(derivation, passphrase, salt)
      try {
        return { realm: await DatabaseAccess.open(keyHex), derivation, keyHex }
      } catch {
        // Try the next one
      }
    }
    throw new Error('No legacy key opens the wallet.')
  }

  public static lock(): Promise<void> {
    return DatabaseAccess.exclusive(() => DatabaseAccess.lockExclusive())
  }

  private static async lockExclusive(): Promise<void> {
    if (!(await DatabaseAccess.isUnlocked())) return

    DatabaseAccess.closeRealm()

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
    ])
  }

  /**
   * True if there is a wallet, including one that is still at its re-key
   * backup path because putting it back failed. A wallet that exists must
   * never be reported as missing: onboarding would then overwrite its salt.
   */
  public static isInitialized(): Promise<boolean> {
    return DatabaseAccess.exclusive(async () => {
      const path = Realm.defaultPath
      const [hasWallet, hasBackup] = await Promise.all([
        RNFS.exists(path),
        RNFS.exists(rekeyBackupPath(path))
      ])
      if (hasWallet) return true
      if (!hasBackup) return false

      try {
        await DatabaseAccess.restoreInterruptedRekey()
      } catch (err) {
        console.error(err)
      }
      return true
    })
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

      await DatabaseAccess.disableBiometrics()
      await SecureStore.deleteItemAsync(WALLET_KEY_DERIVATION)

      // A leftover backup must not be "restored" over the next wallet.
      await DatabaseAccess.removeRekeyLeftovers()

      await Promise.all([
        RNFS.unlink(`${Realm.defaultPath}.lock`),
        RNFS.unlink(`${Realm.defaultPath}.note`),
        RNFS.unlink(`${Realm.defaultPath}.management`),
        RNFS.unlink(Realm.defaultPath)
      ])
    })
  }

  public static initialize(passphrase: string): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      if (await DatabaseAccess.isUnlocked()) {
        throw new Error('Cannot initialize unlocked wallet.')
      }

      const path = Realm.defaultPath
      const existing = await Promise.all(
        [
          path,
          rekeyBackupPath(path),
          rekeyCopyPath(path),
          rekeyPartialPath(path)
        ].map((file) => RNFS.exists(file))
      )
      if (existing.some(Boolean)) {
        throw new Error('Wallet must be in reset state to be initialized')
      }

      const decoder = new encoding.TextDecoder()
      const rawSalt = await generateSecureRandom(64)
      const salt: string = decoder.decode(rawSalt)

      await RNFS.writeFile(PBKDF2_SALT_PATH, salt, 'utf8')

      // Create the Realm with the current key only. Read the salt back as
      // unlock will, so both derive the key from the same string.
      const keyHex = deriveWalletKeyHex(passphrase, await DatabaseAccess.salt())
      const realm = await DatabaseAccess.open(keyHex, { create: true })
      realm.close()
      await SecureStore.setItemAsync(WALLET_KEY_DERIVATION, 'pbkdf2-sha512')
    })
  }

  private static async encryptionKeyHex(): Promise<string> {
    if (!(await DatabaseAccess.isUnlocked())) {
      throw new Error('Wallet is not unlocked.')
    }

    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

    if (key === null) {
      throw new Error('Key not present in keychain.')
    }

    return key
  }

  private static async salt(): Promise<string> {
    return RNFS.readFile(PBKDF2_SALT_PATH, 'utf8')
  }

  /**
   * Opens the wallet with the given hex key. Throws if the file does not
   * exist, unless `create` is set, so that a missing wallet is never silently
   * replaced by an empty one.
   */
  private static async open(
    keyHex: string,
    { path = Realm.defaultPath, create = false, onMigration }: OpenOptions = {}
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
   * Re-encrypts the wallet open in `legacyRealm` (with `legacyKeyHex`) with
   * `keyHex`. Returns the wallet open with whichever key it is now encrypted
   * with, and whether that is `keyHex`.
   *
   * 1. Write an encrypted copy next to the wallet.
   * 2. Check the copy opens with the new key, needs no migration, and holds
   *    the same number of records.
   * 3. Close the wallet, move it aside as a backup, and move the copy into
   *    its place.
   * 4. Open the wallet with the new key, then delete the backup.
   *
   * A failure at any step leaves the original wallet at its path. Only files
   * this creates are deleted. If the app dies between the two moves in step
   * 3, restoreInterruptedRekey puts the backup back.
   */
  private static async rekey(
    legacyRealm: Realm,
    legacyKeyHex: string,
    keyHex: string
  ): Promise<{ realm: Realm; rekeyed: boolean }> {
    const path = legacyRealm.path
    const copyPath = rekeyCopyPath(path)
    const backupPath = rekeyBackupPath(path)

    try {
      legacyRealm.writeCopyTo({
        path: copyPath,
        encryptionKey: realmKeyFromHex(keyHex)
      })

      const copy = await DatabaseAccess.open(keyHex, {
        path: copyPath,
        onMigration: () => {
          throw new Error('Re-keyed copy unexpectedly needs a migration.')
        }
      })
      try {
        assertSameContents(legacyRealm, copy)
      } finally {
        copy.close()
      }
    } catch (err) {
      console.error('Wallet re-key failed; keeping the original key.', err)
      await removeRealmFiles(copyPath).catch(console.error)
      return { realm: legacyRealm, rekeyed: false }
    }

    legacyRealm.close()
    const reopenOriginal = async () => ({
      realm: await DatabaseAccess.open(legacyKeyHex),
      rekeyed: false
    })

    try {
      await RNFS.moveFile(path, backupPath)
    } catch (err) {
      console.error('Wallet re-key failed; keeping the original key.', err)
      await DatabaseAccess.restoreInterruptedRekey()
      await removeRealmFiles(copyPath).catch(console.error)
      return reopenOriginal()
    }

    // The original is now at backupPath, so only the next move puts
    // anything at `path`.
    let copyInPlace = false
    try {
      await RNFS.moveFile(copyPath, path)
      copyInPlace = true
      const realm = await DatabaseAccess.open(keyHex)
      await Promise.all([
        removeRealmFiles(backupPath),
        removeRealmFiles(copyPath) // the copy's side files
      ]).catch(console.error)
      return { realm, rekeyed: true }
    } catch (err) {
      console.error('Wallet re-key failed; restoring the original.', err)
      if (copyInPlace) {
        await RNFS.moveFile(path, copyPath)
      } else if (await RNFS.exists(path)) {
        // A failed move left something unverified at `path`: set it aside,
        // never delete it.
        await RNFS.moveFile(path, rekeyPartialPath(path))
      }
      await RNFS.moveFile(backupPath, path)
      await removeRealmFiles(copyPath).catch(console.error)
      return reopenOriginal()
    }
  }

  /**
   * If the app stopped between moving the wallet aside and moving its
   * re-keyed copy into place, put the original back.
   */
  private static async restoreInterruptedRekey(): Promise<void> {
    const path = Realm.defaultPath
    const backupPath = rekeyBackupPath(path)

    const [hasWallet, hasBackup] = await Promise.all([
      RNFS.exists(path),
      RNFS.exists(backupPath)
    ])
    if (hasWallet || !hasBackup) return

    try {
      await RNFS.moveFile(backupPath, path)
    } catch (err) {
      throw new Error(
        `Could not restore the wallet from ${backupPath}: ${
          (err as Error).message
        }`
      )
    }
  }

  /**
   * Deletes what an interrupted re-key left next to the wallet. Only call
   * this once the wallet itself has opened at `path`.
   */
  private static async removeRekeyLeftovers(
    path: string = Realm.defaultPath
  ): Promise<void> {
    const bases = [
      rekeyCopyPath(path),
      rekeyBackupPath(path),
      rekeyPartialPath(path)
    ]
    const present = await Promise.all(bases.map((b) => RNFS.exists(b)))
    await Promise.all(
      bases.filter((_, i) => present[i]).map((b) => removeRealmFiles(b))
    )
  }

  /**
   * Keeps the biometric keychain in step with the key that just opened the
   * wallet: after a re-key, or after an interruption that left it holding an
   * old key. If it cannot be updated, biometrics is turned off rather than
   * left with a key that no longer opens the wallet.
   */
  private static async refreshBiometricKey(keyHex: string): Promise<void> {
    try {
      if (!(await DatabaseAccess.isBiometricsEnabled())) return

      const fingerprint = walletKeyFingerprint(keyHex)
      const stored = await SecureStore.getItemAsync(BIOMETRIC_KEY_FINGERPRINT)
      if (stored === fingerprint) return

      if (await storeInBiometricKeychain(keyHex)) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY_FINGERPRINT, fingerprint)
        return
      }
      console.error('Could not update the biometric key; disabling.')
    } catch (err) {
      console.error('Could not update the biometric key; disabling.', err)
    }
    await DatabaseAccess.disableBiometrics().catch(console.error)
  }

  /** Marks the wallet locked and forgets the key, whatever state it is in. */
  private static async clearUnlockedState(): Promise<void> {
    await Promise.allSettled([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
    ])
  }

  private static closeRealm(): void {
    const realm = DatabaseAccess.realm
    DatabaseAccess.realm = null
    if (realm !== null && !realm.isClosed) realm.close()
  }

  private static realm: Realm | null = null
  private static async instance(): Promise<Realm> {
    if (DatabaseAccess.realm !== null) {
      return DatabaseAccess.realm
    } else {
      return (DatabaseAccess.realm = await DatabaseAccess.open(
        await DatabaseAccess.encryptionKeyHex()
      ))
    }
  }
}

export { models, DatabaseAccess as db }
