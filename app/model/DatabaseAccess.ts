import Realm from 'realm'
import * as SecureStore from 'expo-secure-store'
import * as RNFS from 'react-native-fs'
import * as encoding from 'text-encoding'
import { generateSecureRandom } from 'react-native-securerandom'
import { pbkdf2Sync } from 'crypto'
import { bytesToHex } from '@noble/hashes/utils'

import {
  resetBiometricKeychain,
  retrieveFromBiometricKeychain,
  storeInBiometricKeychain
} from '../lib/biometrics'
import { legacyPlaceholderPbkdf2 } from '../lib/legacyPlaceholderPbkdf2'
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

const PBKDF2_ITERATIONS = 10000
const PBKDF2_KEY_LENGTH = 32
const PBKDF2_DIGEST = 'sha512'
const PBKDF2_SALT_PATH = `${RNFS.DocumentDirectoryPath}/edu-wallet-salt`

// Files next to the wallet while it is re-encrypted (see DatabaseAccess.rekey)
const REKEY_COPY_SUFFIX = '.rekey'
const REKEY_BACKUP_SUFFIX = '.legacy-backup'
const REALM_AUX_SUFFIXES = ['.lock', '.note', '.management']

/**
 * The wallet key: PBKDF2-HMAC-SHA512, as derived by release 2.2.5 and
 * earlier. Each byte is 2 hex characters, giving the 64 characters Realm
 * needs (see realmKeyFromHex).
 */
function deriveKeyHex(passphrase: string, salt: string): string {
  return pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  ).toString('hex')
}

/**
 * The key that releases 2.2.6 to 2.2.10 derived by mistake (issue #960). Used
 * only to open a wallet set up on those releases so it can be re-keyed.
 */
function deriveLegacyKeyHex(passphrase: string, salt: string): string {
  return bytesToHex(
    legacyPlaceholderPbkdf2(
      passphrase,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH
    )
  )
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

type OpenOptions = {
  /** Defaults to Realm.defaultPath. */
  path?: string
  /** Create the wallet if the file does not exist. Only for initialize. */
  create?: boolean
  onMigration?: Realm.MigrationCallback
}

class DatabaseAccess {
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

  public static async unlockWithBiometrics(): Promise<void> {
    if (!(await this.isBiometricsEnabled)) {
      throw new Error('Biometric authentication is not enabled.')
    }

    await DatabaseAccess.restoreInterruptedRekey()

    const key = await retrieveFromBiometricKeychain()

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, key)
    ])

    // Attempt database decryption to see if key is valid
    try {
      await DatabaseAccess.instance()
    } catch (err) {
      await DatabaseAccess.lock()

      throw err
    }
  }

  public static async enableBiometrics(): Promise<void> {
    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

    if (key === null) {
      throw new Error('The wallet must be unlocked to enable biometrics')
    }

    await storeInBiometricKeychain(key)
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, ENABLED)
  }

  public static async disableBiometrics(): Promise<void> {
    await resetBiometricKeychain()
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, DISABLED)
  }

  /**
   * This generates the key to unlock the wallet and stores it
   * in SecureStorage. Please adhere to these guidelines:
   *   1. Never store/persist the passphrase. It should only exist in input an
   *      the variable passed to this function.
   *   2. Never store the key generated in any place but SecureStorage
   *
   * The wallet is opened with the PBKDF2 key first. If that fails, it is tried
   * with the placeholder key of releases 2.2.6 to 2.2.10 (issue #960), and on
   * success it is re-encrypted under the PBKDF2 key. If the re-encryption
   * fails, the wallet is unlocked with the placeholder key and re-encryption
   * is tried again at the next unlock.
   */
  public static async unlock(passphrase: string): Promise<void> {
    if (await this.isUnlocked()) return

    await DatabaseAccess.restoreInterruptedRekey()

    const salt = await DatabaseAccess.salt()
    const keyHex = deriveKeyHex(passphrase, salt)

    let realm: Realm
    let openedKeyHex = keyHex
    let rekeyed = false
    try {
      realm = await DatabaseAccess.open(keyHex)
    } catch (err) {
      const legacyKeyHex = deriveLegacyKeyHex(passphrase, salt)
      let legacyRealm: Realm
      try {
        legacyRealm = await DatabaseAccess.open(legacyKeyHex)
      } catch {
        // Neither key opens it: report the PBKDF2 attempt's error, as before.
        throw err
      }

      rekeyed = await DatabaseAccess.rekey(legacyRealm, keyHex)
      openedKeyHex = rekeyed ? keyHex : legacyKeyHex
      realm = await DatabaseAccess.open(openedKeyHex)
    }

    // The wallet opened, so any copy or backup left by an interrupted re-key
    // is redundant.
    await DatabaseAccess.removeRekeyLeftovers().catch(console.error)

    DatabaseAccess.realm = realm
    try {
      await Promise.all([
        SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
        SecureStore.setItemAsync(PRIVILEGED_KEY_KID, openedKeyHex)
      ])
    } catch (err) {
      DatabaseAccess.closeRealm()
      await DatabaseAccess.lock()

      throw err
    }

    if (rekeyed) await DatabaseAccess.updateBiometricKey(keyHex)
  }

  public static async lock(): Promise<void> {
    if (!(await this.isUnlocked())) return

    DatabaseAccess.closeRealm()

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
    ])
  }

  public static async isInitialized(): Promise<boolean> {
    try {
      await DatabaseAccess.restoreInterruptedRekey()
    } catch (err) {
      console.error('Could not restore the wallet backup:', err)
    }

    /**
     * We can't use `Realm.exists` here because the config is
     * only available for the unlocked state.
     */
    return RNFS.exists(Realm.defaultPath)
  }

  /**
   * WARNING: Calling these two functions are destructive. They will wipe out the
   * existing salt and database.
   */
  public static async reset(): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) {
      throw new Error('Cannot reset unlocked wallet.')
    }

    await DatabaseAccess.disableBiometrics()

    // A leftover backup must not be "restored" over the next wallet.
    await DatabaseAccess.removeRekeyLeftovers()

    await Promise.all([
      RNFS.unlink(`${Realm.defaultPath}.lock`),
      RNFS.unlink(`${Realm.defaultPath}.note`),
      RNFS.unlink(`${Realm.defaultPath}.management`),
      RNFS.unlink(Realm.defaultPath)
    ])
  }

  public static async initialize(passphrase: string): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) {
      throw new Error('Cannot initialize unlocked wallet.')
    }

    if (await DatabaseAccess.isInitialized()) {
      throw new Error('Wallet must be in reset state to be initialized')
    }

    const decoder = new encoding.TextDecoder()
    const rawSalt = await generateSecureRandom(64)
    const salt: string = decoder.decode(rawSalt)

    await RNFS.writeFile(PBKDF2_SALT_PATH, salt, 'utf8')

    // Create the Realm, encrypted with the PBKDF2 key. Read the salt back as
    // unlock will, so both derive the key from the same string.
    const keyHex = deriveKeyHex(passphrase, await DatabaseAccess.salt())
    const realm = await DatabaseAccess.open(keyHex, { create: true })
    realm.close()
  }

  private static async encryptionKeyHex(): Promise<string> {
    if (!(await this.isUnlocked())) {
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
   * Re-encrypts the wallet open in `legacyRealm` with `keyHex`, and closes
   * `legacyRealm`. Returns true if the wallet file is now encrypted with
   * `keyHex`, or false if it was left as it was.
   *
   * 1. Write an encrypted copy next to the wallet.
   * 2. Check the copy opens with the new key, needs no migration, and holds
   *    the same number of records.
   * 3. Move the wallet aside as a backup and move the copy into its place.
   * 4. Check the wallet opens with the new key, then delete the backup.
   *
   * A failure at any step leaves the original wallet at its path. If the app
   * dies between the two moves in step 3, restoreInterruptedRekey puts the
   * backup back on the next start.
   */
  private static async rekey(
    legacyRealm: Realm,
    keyHex: string
  ): Promise<boolean> {
    const path = legacyRealm.path
    const copyPath = `${path}${REKEY_COPY_SUFFIX}`
    const backupPath = `${path}${REKEY_BACKUP_SUFFIX}`

    try {
      await DatabaseAccess.removeRekeyLeftovers(path)

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
      legacyRealm.close()
      await DatabaseAccess.removeRekeyLeftovers(path).catch(console.error)
      return false
    }

    legacyRealm.close()

    try {
      await RNFS.moveFile(path, backupPath)
    } catch (err) {
      console.error('Wallet re-key failed; keeping the original key.', err)
      await DatabaseAccess.restoreInterruptedRekey()
      await DatabaseAccess.removeRekeyLeftovers(path).catch(console.error)
      return false
    }

    try {
      await RNFS.moveFile(copyPath, path)
      const swapped = await DatabaseAccess.open(keyHex, { path })
      swapped.close()
    } catch (err) {
      console.error('Wallet re-key failed; restoring the original.', err)
      // With the original moved aside, anything at `path` is the copy.
      if (await RNFS.exists(path)) await RNFS.unlink(path)
      await RNFS.moveFile(backupPath, path)
      await DatabaseAccess.removeRekeyLeftovers(path).catch(console.error)
      return false
    }

    await DatabaseAccess.removeRekeyLeftovers(path).catch(console.error)
    return true
  }

  /**
   * If the app stopped between moving the wallet aside and moving its
   * re-keyed copy into place, put the original back.
   */
  private static async restoreInterruptedRekey(): Promise<void> {
    const path = Realm.defaultPath
    const backupPath = `${path}${REKEY_BACKUP_SUFFIX}`

    if (!(await RNFS.exists(path)) && (await RNFS.exists(backupPath))) {
      await RNFS.moveFile(backupPath, path)
    }
  }

  /**
   * Deletes the re-key copy and backup, with their Realm side files. Only
   * call this while the wallet itself is at `path`.
   */
  private static async removeRekeyLeftovers(
    path: string = Realm.defaultPath
  ): Promise<void> {
    for (const base of [
      `${path}${REKEY_COPY_SUFFIX}`,
      `${path}${REKEY_BACKUP_SUFFIX}`
    ]) {
      for (const file of [base, ...REALM_AUX_SUFFIXES.map((s) => base + s)]) {
        if (await RNFS.exists(file)) await RNFS.unlink(file)
      }
    }
  }

  /**
   * After a re-key, the biometric keychain still holds the placeholder key.
   * If it cannot be updated, turn biometrics off rather than leave a key that
   * no longer opens the wallet.
   */
  private static async updateBiometricKey(keyHex: string): Promise<void> {
    try {
      if (!(await DatabaseAccess.isBiometricsEnabled())) return
      await storeInBiometricKeychain(keyHex)
    } catch (err) {
      console.error('Could not update the biometric key; disabling.', err)
      await DatabaseAccess.disableBiometrics().catch(console.error)
    }
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
