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
 * walletKeyFingerprint of the PBKDF2-SHA512 key derived from the passphrase
 * that last opened a placeholder-key wallet (releases 2.2.6 to 2.2.10). The
 * placeholder can accept some wrong passphrases, such as some typos, so such
 * a wallet is re-keyed only once the same passphrase has opened it on two
 * separate unlocks: otherwise a typo could become the wallet's key.
 */
const PENDING_REKEY_FINGERPRINT = 'pending_rekey_fingerprint'

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
  nameFor(stamp: number): string {
    return `wallet-${stamp}.realm`
  },
  sideSuffixes: ['.lock', '.note', '.management'],
  sideFiles(path: string): string[] {
    return walletFiles.sideSuffixes.map((s) => path + s)
  },
  /** A re-keyed file, or one of its side files */
  isRekeyedFileName(name: string): boolean {
    const side = walletFiles.sideSuffixes.find((s) => name.endsWith(s))
    return rekeyedStamp(side ? name.slice(0, -side.length) : name) !== null
  }
}

/**
 * The timestamp in a re-keyed file's name (wallet-<timestamp>.realm), or
 * null if the name or path is not one. The only parser of these names.
 */
function rekeyedStamp(nameOrPath: string): number | null {
  const match = /^wallet-(\d+)\.realm$/.exec(walletFiles.nameOf(nameOrPath))
  return match ? Number(match[1]) : null
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

/** The timestamp in a re-keyed file's name; default.realm is the oldest. */
function age(path: string): number {
  return rekeyedStamp(path) ?? 0
}

const isRekeyed = (path: string) => rekeyedStamp(path) !== null

/** Every wallet file that exists, newest first (default.realm last). */
async function existingWalletPaths(): Promise<string[]> {
  const entries = await RNFS.readDir(walletFiles.dir())
  const defaultName = walletFiles.nameOf(Realm.defaultPath)
  const hasDefault = entries.some((entry) => entry.name === defaultName)
  const rekeyed = entries
    .filter((entry) => isRekeyed(entry.name))
    .map((entry) => entry.path)
    .sort((a, b) => age(b) - age(a))
  return hasDefault ? [...rekeyed, Realm.defaultPath] : rekeyed
}

/** When the file was last written to, in milliseconds. */
async function modifiedAt(path: string): Promise<number> {
  // RNFS returns a Date here, although its typings say number.
  const mtime = (await RNFS.stat(path)).mtime as unknown
  return mtime instanceof Date ? mtime.getTime() : Number(mtime)
}

/**
 * Newest first by modification time: the file last written to is the live
 * one. Ties go to the newer name, and default.realm comes last.
 */
async function byModifiedTime(paths: string[]): Promise<string[]> {
  const times = new Map(
    await Promise.all(
      paths.map(async (p) => [p, await modifiedAt(p)] as [string, number])
    )
  )
  return [...paths].sort(
    (a, b) =>
      (times.get(b) as number) - (times.get(a) as number) || age(b) - age(a)
  )
}

type Candidates = {
  /** The existing file the pointer names, or null */
  pointed: string | null
  /**
   * Without a usable pointer: every wallet file, last written first.
   * Empty when `pointed` is set.
   */
  fallbacks: string[]
  /**
   * The pointer is absent (not unreadable, and not naming a missing file),
   * so default.realm is current by definition.
   */
  pointerAbsent: boolean
  /** The pointer could be read (it may still be absent) */
  pointerReadable: boolean
}

/**
 * The current wallet file. If the pointer is readable and names a file that
 * exists, that is the only candidate. Otherwise every wallet file is, last
 * written first.
 */
async function walletCandidates(): Promise<Candidates> {
  let name: string | null = null
  let pointerAbsent = false
  let pointerReadable = false
  try {
    name = await SecureStore.getItemAsync(WALLET_FILE)
    pointerAbsent = name === null
    pointerReadable = true
  } catch (err) {
    console.error('Could not read the wallet file pointer:', err)
  }

  if (name !== null) {
    const pointed = walletFiles.pathFor(name)
    if (await RNFS.exists(pointed)) {
      return {
        pointed,
        fallbacks: [],
        pointerAbsent: false,
        pointerReadable: true
      }
    }
    console.error(`Wallet file ${pointed} is missing.`)
  }
  const fallbacks = await byModifiedTime(await existingWalletPaths())
  return { pointed: null, fallbacks, pointerAbsent, pointerReadable }
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
   * Files this process made current: written by a re-key, or chosen without
   * a usable pointer. Older files are kept until the current one has opened
   * in a later process, which shows it survived on disk.
   */
  private static madeCurrentThisProcess = new Set<string>()

  /**
   * Do not store off the instance from withInstance for any reason. If you need
   * to do work on the database, do all of it within the callback to withInstance.
   */
  public static async withInstance<T>(
    callback: (instance: Realm) => T | Promise<T>
  ): Promise<T> {
    const database = await DatabaseAccess.instance()

    const running = DatabaseAccess.activeCallbacks
    running.set(database, (running.get(database) ?? 0) + 1)
    try {
      return await callback(database)
    } finally {
      const left = (running.get(database) ?? 1) - 1
      if (left > 0) {
        running.set(database, left)
      } else {
        running.delete(database)
        if (DatabaseAccess.closeWhenIdle.delete(database)) {
          DatabaseAccess.closeDetached(database).catch(console.error)
        }
      }
    }
  }

  /** How many withInstance callbacks are running on each Realm instance */
  private static activeCallbacks = new Map<Realm, number>()
  /** Instances to close once their last running callback finishes */
  private static closeWhenIdle = new Set<Realm>()

  /**
   * Closes a detached instance whose last callback has ended, in turn with
   * unlocks so none is half done. realm-js opens with `cache: true`, so an
   * unlock of the same file while this instance was still open returned a
   * new JS Realm sharing its core Realm, and close() on either closes that
   * shared core Realm. So if the open wallet is now the same file, this
   * instance is left to close with it.
   */
  private static closeDetached(realm: Realm): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      if (realm.isClosed) return
      if (DatabaseAccess.realm?.path === realm.path) return
      realm.close()
    })
  }

  /**
   * Closes every detached instance now, even under a running callback
   * (which then fails on a closed Realm). Only for reset and initialize.
   */
  private static forceCloseDetached(): void {
    for (const realm of DatabaseAccess.closeWhenIdle) {
      if (!realm.isClosed) realm.close()
    }
    DatabaseAccess.closeWhenIdle.clear()
  }

  /**
   * Closes a Realm instance that is no longer the open wallet: now if no
   * withInstance callback is using it, otherwise when the last one ends.
   */
  private static release(realm: Realm | null): void {
    if (realm === null || realm.isClosed) return
    if (DatabaseAccess.activeCallbacks.has(realm)) {
      DatabaseAccess.closeWhenIdle.add(realm)
    } else {
      realm.close()
    }
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
   * than the current one, and that file becomes current (see
   * openWithStoredKey).
   */
  public static async unlockWithBiometrics(): Promise<void> {
    if (!(await DatabaseAccess.isBiometricsEnabled())) {
      throw new Error('Biometric authentication is not enabled.')
    }

    const keyHex = await retrieveFromBiometricKeychain()

    return DatabaseAccess.exclusive(async () => {
      if (await DatabaseAccess.isUnlocked()) return

      const realm = await DatabaseAccess.openWithStoredKey(keyHex)
      await DatabaseAccess.adopt({ realm, keyHex })
      // The keychain key has just opened the current file.
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(keyHex)
      ).catch(console.error)
    })
  }

  /**
   * If the key cannot be stored in the keychain, sets biometrics off and
   * throws, so the Settings switch goes back.
   */
  public static enableBiometrics(): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

      if (!key) {
        throw new Error('The wallet must be unlocked to enable biometrics')
      }

      await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
      if (!(await storeInBiometricKeychain(key))) {
        await SecureStore.setItemAsync(BIOMETRICS_STATUS, DISABLED)
        throw new Error('Could not store the key for biometric unlock.')
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

  /**
   * The fingerprint goes first, so that an interruption never leaves one
   * vouching for a keychain key that is gone or stale.
   */
  private static async disableBiometricsExclusive(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, DISABLED)
    // Biometrics is already off; a leftover keychain item opens nothing
    // without the status, so a failure here must not stop the caller.
    await resetBiometricKeychain().catch((err) =>
      console.error('Could not clear the biometric keychain:', err)
    )
  }

  /**
   * This generates the key to unlock the wallet and stores it
   * in SecureStorage. Please adhere to these guidelines:
   *   1. Never store/persist the passphrase. It should only exist in input an
   *      the variable passed to this function.
   *   2. Never store the key generated in any place but SecureStorage
   *
   * Only the file the pointer names is tried, if there is one (see
   * walletCandidates). It is tried with the current key (PBKDF2-SHA512) and,
   * if it is default.realm, with each legacy key in LEGACY_KEY_DERIVATIONS
   * (see walletKey.ts and issue #960), unless the derivation marker says the
   * wallet is already on the current key. Re-keyed files are only ever
   * written with the current key. If a legacy key opens default.realm, the
   * wallet is re-encrypted with the current key into a new file (see rekey).
   * If that fails, it stays on the legacy key and re-encryption is tried
   * again at the next unlock.
   */
  public static unlock(passphrase: string): Promise<void> {
    return DatabaseAccess.exclusive(() =>
      DatabaseAccess.unlockExclusive(passphrase)
    )
  }

  private static async unlockExclusive(passphrase: string): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) return

    const { pointed, fallbacks } = await walletCandidates()
    const paths = pointed !== null ? [pointed] : fallbacks
    if (paths.length === 0) throw new Error('Wallet database not found.')

    const salt = await DatabaseAccess.salt()
    const keyHex = deriveWalletKeyHex(passphrase, salt)

    // The marker is only ever written after a successful open with that
    // derivation, so 'pbkdf2-sha512' means no legacy key can be right, and a
    // legacy value names the legacy key to try first.
    const marker = await SecureStore.getItemAsync(WALLET_KEY_DERIVATION).catch(
      () => null
    )
    const legacyPossible = marker !== 'pbkdf2-sha512'

    let opened: (Opened & { derivation: KeyDerivation }) | undefined
    let firstError: unknown
    for (const path of paths) {
      try {
        const realm = await DatabaseAccess.open(keyHex, path)
        opened = { realm, keyHex, derivation: 'pbkdf2-sha512' }
        break
      } catch (err) {
        if (firstError === undefined) firstError = err
      }
      if (path === Realm.defaultPath && legacyPossible) {
        try {
          opened = await DatabaseAccess.openWithLegacyKey(
            passphrase,
            salt,
            path,
            marker
          )
          break
        } catch {
          // Not this file either
        }
      }
    }
    // No key opens it: report the current key's error, as before, and
    // change nothing.
    if (opened === undefined) throw firstError

    await DatabaseAccess.makeCurrent(opened.realm, pointed)

    let final: Opened = opened
    let derivation = opened.derivation
    if (
      derivation === 'legacy-sha1' ||
      (derivation === 'legacy-placeholder' &&
        (await DatabaseAccess.confirmPlaceholderPassphrase(keyHex)))
    ) {
      const rekeyed = await DatabaseAccess.rekey(opened, keyHex)
      if (rekeyed !== null) {
        final = { realm: rekeyed, keyHex }
        derivation = 'pbkdf2-sha512'
      }
    }

    await DatabaseAccess.adopt(final, derivation)
    await DatabaseAccess.refreshBiometricKey(final.keyHex)
  }

  /**
   * True if this passphrase (by the fingerprint of its PBKDF2-SHA512 key)
   * also opened the placeholder-key wallet at the previous passphrase
   * unlock. Otherwise records it, so that the next unlock can confirm it.
   */
  private static async confirmPlaceholderPassphrase(
    keyHex: string
  ): Promise<boolean> {
    const fingerprint = walletKeyFingerprint(keyHex)
    const pending = await SecureStore.getItemAsync(
      PENDING_REKEY_FINGERPRINT
    ).catch(() => null)
    if (pending === fingerprint) return true

    await SecureStore.setItemAsync(
      PENDING_REKEY_FINGERPRINT,
      fingerprint
    ).catch((err) =>
      console.error('Could not record the passphrase to confirm:', err)
    )
    return false
  }

  /**
   * Tries the legacy derivation the marker names, or each in turn when it
   * names none; throws if none opens the file. default.realm is never
   * re-encrypted in place, so a known derivation stays right.
   */
  private static async openWithLegacyKey(
    passphrase: string,
    salt: string,
    path: string,
    marker: string | null
  ): Promise<Opened & { derivation: KeyDerivation }> {
    const known = LEGACY_KEY_DERIVATIONS.find((d) => d === marker)
    const order = known ? [known] : LEGACY_KEY_DERIVATIONS
    for (const derivation of order) {
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
   * Opens the wallet with a key that was stored rather than derived (from
   * the biometric keychain, or SecureStore after a restart).
   *
   * With a pointer, only the file it names is tried, plus one forward move:
   * if that file does not open with this key, a newer re-keyed file left by
   * an interrupted re-key may, but only if it was written no earlier than
   * the pointed file, so a stale copy never replaces a file written since.
   * Without a pointer, re-keyed files are tried last written first, and
   * default.realm only when there is no pointer at all. A different file
   * that opens becomes current, and the derivation marker is cleared, since
   * a stored key does not say how it was derived.
   */
  private static async openWithStoredKey(keyHex: string): Promise<Realm> {
    const { pointed, fallbacks, pointerAbsent, pointerReadable } =
      await walletCandidates()

    let tries: string[]
    if (pointed === null) {
      // default.realm only when it must be current: there is no pointer,
      // or no re-keyed file for an unreadable pointer to have named.
      const defaultAllowed = pointerAbsent || !fallbacks.some(isRekeyed)
      tries = fallbacks.filter(
        (p) => isRekeyed(p) || (defaultAllowed && p === Realm.defaultPath)
      )
    } else {
      tries = [pointed]
      try {
        const pointedAt = await modifiedAt(pointed)
        const newer = (await existingWalletPaths()).filter(
          (p) => isRekeyed(p) && age(p) > age(pointed)
        )
        for (const p of await byModifiedTime(newer)) {
          if ((await modifiedAt(p)) >= pointedAt) tries.push(p)
        }
      } catch (err) {
        console.error('Could not look for a newer wallet file:', err)
      }
    }

    let realm: Realm | undefined
    let firstError: unknown = new Error('Wallet database not found.')
    for (const [i, path] of tries.entries()) {
      try {
        realm = await DatabaseAccess.open(keyHex, path)
        break
      } catch (err) {
        if (i === 0) firstError = err
      }
    }
    if (realm === undefined) throw firstError

    // The marker describes the file the pointer names (default.realm when
    // there is none). Clear it only when this key opened a different file,
    // which is known only if the pointer could be read.
    const current = pointed ?? (pointerAbsent ? Realm.defaultPath : null)
    if (pointerReadable && realm.path !== current) {
      await SecureStore.deleteItemAsync(WALLET_KEY_DERIVATION).catch(
        console.error
      )
    }
    await DatabaseAccess.makeCurrent(realm, pointed)
    return realm
  }

  /**
   * Makes the file `realm` has open the current one. If the pointer did not
   * name it, points WALLET_FILE at it and deletes nothing in this process.
   * If it did, and this process did not make it current, deletes the
   * wallet files that are older than it (by name) and were not written to
   * after it: it has now opened in a process after the one that switched
   * to it.
   */
  private static async makeCurrent(
    realm: Realm,
    pointed: string | null
  ): Promise<void> {
    if (realm.path !== pointed) {
      try {
        await DatabaseAccess.writePointer(realm.path)
      } catch (err) {
        realm.close()
        throw err
      }
      DatabaseAccess.madeCurrentThisProcess.add(realm.path)
      return
    }
    if (DatabaseAccess.madeCurrentThisProcess.has(realm.path)) return

    try {
      const currentAt = await modifiedAt(realm.path)
      const older = (await existingWalletPaths()).filter(
        (p) => age(p) < age(realm.path)
      )
      for (const p of older) {
        if ((await modifiedAt(p)) <= currentAt) await removeRealmFiles(p)
      }
    } catch (err) {
      console.error('Could not remove old wallet files:', err)
    }
  }

  /**
   * Makes `realm` the open wallet and records the unlocked state. On failure
   * nothing is left unlocked.
   */
  private static async adopt(
    { realm, keyHex }: Opened,
    derivation?: KeyDerivation
  ): Promise<void> {
    try {
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

    // Detach the open Realm and mark the wallet locked, so a new
    // withInstance waits for this lock and is then refused. The Realm closes
    // now if nothing is using it, otherwise when the last running callback
    // finishes; lock does not wait for that.
    const realm = DatabaseAccess.realm
    DatabaseAccess.realm = null
    try {
      await Promise.all([
        SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
        SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
      ])
    } finally {
      DatabaseAccess.release(realm)
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
      DatabaseAccess.forceCloseDetached()

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
      await SecureStore.deleteItemAsync(PENDING_REKEY_FINGERPRINT)
    })
  }

  /**
   * Creates the wallet and leaves it unlocked, so that the unlock that
   * follows during onboarding does not derive the key a second time.
   *
   * Biometric state is reset first: iOS keeps the keychain and SecureStore
   * across a reinstall, and onboarding enables biometrics afresh if asked.
   */
  public static initialize(passphrase: string): Promise<void> {
    return DatabaseAccess.exclusive(async () => {
      if (await DatabaseAccess.isUnlocked()) {
        throw new Error('Cannot initialize unlocked wallet.')
      }

      if ((await existingWalletPaths()).length > 0) {
        throw new Error('Wallet must be in reset state to be initialized')
      }
      DatabaseAccess.forceCloseDetached()
      // Biometrics starts off; a keychain failure must not block onboarding.
      await DatabaseAccess.disableBiometricsExclusive()
      await SecureStore.deleteItemAsync(PENDING_REKEY_FINGERPRINT)

      const decoder = new encoding.TextDecoder()
      const rawSalt = await generateSecureRandom(64)
      const salt: string = decoder.decode(rawSalt)

      let realm: Realm | null = null
      try {
        await RNFS.writeFile(PBKDF2_SALT_PATH, salt, 'utf8')

        // Create the Realm with the current key only. Read the salt back as
        // unlock will, so both derive the key from the same string.
        const keyHex = deriveWalletKeyHex(
          passphrase,
          await DatabaseAccess.salt()
        )
        realm = await DatabaseAccess.open(keyHex, Realm.defaultPath, {
          create: true
        })
        await DatabaseAccess.makeCurrent(realm, null)
        await DatabaseAccess.adopt({ realm, keyHex }, 'pbkdf2-sha512')
      } catch (err) {
        // Leave nothing half-created, so setup can simply run again.
        console.error('Wallet setup failed; removing what it created.', err)
        DatabaseAccess.closeRealm()
        if (realm !== null && !realm.isClosed) realm.close()
        await DatabaseAccess.clearUnlockedState()
        await Promise.allSettled([
          removeRealmFiles(Realm.defaultPath),
          removeFiles([PBKDF2_SALT_PATH]),
          SecureStore.deleteItemAsync(WALLET_FILE),
          SecureStore.deleteItemAsync(WALLET_KEY_DERIVATION)
        ])
        throw err
      }
    })
  }

  private static async salt(): Promise<string> {
    return RNFS.readFile(PBKDF2_SALT_PATH, 'utf8')
  }

  /** Switches the current wallet file, in one SecureStore write. */
  private static async writePointer(path: string): Promise<void> {
    await SecureStore.setItemAsync(WALLET_FILE, walletFiles.nameOf(path))
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
   * 3. Make the copy durable: commit a write transaction on it, which syncs
   *    the file to disk.
   * 4. If biometrics is on, store the new key in the keychain, so a
   *    biometric unlock can find the new file even if the app stops before
   *    step 5. If it cannot be stored, turn biometrics off first.
   * 5. Point WALLET_FILE at the new file. This one write is the switch.
   *
   * A failure before step 5 deletes only the new file and puts biometrics
   * back as it was. After the switch, unlock opens only the new file (see
   * walletCandidates). The old file is kept, as a copy for manual recovery
   * only, until the new file has opened in a later process; then makeCurrent
   * deletes it.
   */
  private static async rekey(
    legacy: Opened,
    keyHex: string
  ): Promise<Realm | null> {
    // Without knowing whether biometrics is on, the keychain cannot be kept
    // in step with the switch: leave the wallet as it is and retry later.
    let biometrics: boolean
    try {
      biometrics = await DatabaseAccess.isBiometricsEnabled()
    } catch (err) {
      console.error('Could not read the biometrics status; not re-keying.', err)
      return null
    }
    let newPath: string | null = null
    let copy: Realm | null = null
    let keychainTouched = false
    let keychainHasNewKey = false
    let biometricsTurnedOff = false

    try {
      newPath = await DatabaseAccess.newWalletPath()
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

      // writeCopyTo does not sync the file to disk: in realm-core 20.1.0,
      // Group::write only flushes its stream buffer. A committed write
      // transaction does, even an empty one: commitTransaction always runs
      // DB::do_commit, whose GroupCommitter::commit calls File::barrier
      // (fsync on Android, F_BARRIERFSYNC on iOS) under Realm's default Full
      // durability. So the pointer never names a file that is not on disk.
      copy.write(() => undefined)

      if (biometrics) {
        // From here the keychain may hold either key, so the fingerprint
        // must not vouch for either until the switch has happened or not.
        await SecureStore.deleteItemAsync(BIOMETRIC_KEY_FINGERPRINT)
        keychainTouched = true
        keychainHasNewKey = await storeInBiometricKeychain(keyHex).catch(
          () => false
        )
        if (!keychainHasNewKey) {
          // Never switch files with biometrics on and holding an old key.
          await DatabaseAccess.disableBiometricsExclusive()
          biometricsTurnedOff = true
        }
      }

      await DatabaseAccess.writePointer(newPath)
    } catch (err) {
      console.error('Wallet re-key failed; keeping the original key.', err)
      if (copy !== null && !copy.isClosed) copy.close()
      if (newPath !== null) {
        await removeRealmFiles(newPath).catch(console.error)
      }
      if (biometricsTurnedOff) {
        await DatabaseAccess.reenableBiometrics(legacy.keyHex)
      } else if (keychainTouched) {
        await DatabaseAccess.setBiometricKey(legacy.keyHex)
      }
      return null
    }

    // Switched: the new file is current. The old one stays for now.
    DatabaseAccess.madeCurrentThisProcess.add(newPath)
    legacy.realm.close()
    await SecureStore.deleteItemAsync(PENDING_REKEY_FINGERPRINT).catch(
      console.error
    )
    if (keychainHasNewKey) {
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(keyHex)
      ).catch(console.error)
    }
    return copy
  }

  /** A new re-keyed file name, newer than any existing one. */
  private static async newWalletPath(): Promise<string> {
    const newestAge = Math.max(0, ...(await existingWalletPaths()).map(age))
    for (let stamp = Math.max(Date.now(), newestAge + 1); ; stamp++) {
      const path = walletFiles.pathFor(walletFiles.nameFor(stamp))
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
   * Turns biometrics back on with `keyHex`, which opens the current wallet
   * file, if it can be stored in the keychain; otherwise leaves it off.
   */
  private static async reenableBiometrics(keyHex: string): Promise<void> {
    try {
      if (!(await storeInBiometricKeychain(keyHex))) return
      await SecureStore.setItemAsync(BIOMETRICS_STATUS, ENABLED)
      await SecureStore.setItemAsync(
        BIOMETRIC_KEY_FINGERPRINT,
        walletKeyFingerprint(keyHex)
      )
    } catch (err) {
      console.error('Could not turn biometrics back on.', err)
      await DatabaseAccess.disableBiometricsExclusive().catch(console.error)
    }
  }

  /**
   * Keeps the biometric keychain in step with the key that just opened the
   * current wallet file, after a re-key or an interruption that left it
   * holding another key.
   */
  private static async refreshBiometricKey(keyHex: string): Promise<void> {
    try {
      if (!(await DatabaseAccess.isBiometricsEnabled())) return
    } catch (err) {
      // Without the status, neither store a key nor turn biometrics off.
      console.error('Could not read the biometrics status.', err)
      return
    }
    try {
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
    DatabaseAccess.realm = realm
    if (previous !== realm) DatabaseAccess.release(previous)
  }

  private static closeRealm(): void {
    const realm = DatabaseAccess.realm
    DatabaseAccess.realm = null
    DatabaseAccess.release(realm)
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

      const realm = await DatabaseAccess.openWithStoredKey(keyHex)
      DatabaseAccess.setRealm(realm)
      return realm
    })
  }
}

export { models, DatabaseAccess as db }
