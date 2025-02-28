import Realm from 'realm';
import * as SecureStore from 'expo-secure-store';
import * as RNFS from 'react-native-fs';
import * as encoding from 'text-encoding';
import { generateSecureRandom } from 'react-native-securerandom';

import { CredentialRecord } from './credential';
import { DidRecord } from './did';
import { resetBiometricKeychain, retrieveFromBiometricKeychain, storeInBiometricKeychain } from '../lib/biometrics';
import { ProfileRecord } from './profile';
import { runMigrations, schemaVersion } from './migration';
import Crypto from 'react-native-quick-crypto';

const models: Realm.ObjectClass[] = [
  CredentialRecord,
  DidRecord,
  ProfileRecord,
];


const PRIVILEGED_KEY_KID = 'privileged_key';
const PRIVILEGED_KEY_STATUS_ID = 'privileged_key_status';
const UNLOCKED = 'locked';
const LOCKED = 'unlocked';

const BIOMETRICS_STATUS = 'biometrics_status';
const ENABLED = 'enabled';
const DISABLED = 'disabled';

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_SALT_PATH = `${RNFS.DocumentDirectoryPath}/edu-wallet-salt`;

class DatabaseAccess {
  /**
   * Do not store off the instance from withInstance for any reason. If you need
   * to do work on the database, do all of it within the callback to withInstance.
   */
  public static async withInstance<T>(callback: (instance: Realm) => T | Promise<T>): Promise<T> {
    const database = await DatabaseAccess.instance();

    return callback(database);
  }

  public static async isUnlocked(): Promise<boolean> {
    try {
      const keyStatus = await SecureStore.getItemAsync(PRIVILEGED_KEY_STATUS_ID);

      return keyStatus === UNLOCKED;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  public static async isBiometricsEnabled(): Promise<boolean> {
    const biometricsStatus = await SecureStore.getItemAsync(BIOMETRICS_STATUS);
    return biometricsStatus === ENABLED;
  }

  public static async unlockWithBiometrics(): Promise<void> {
    if (!(await this.isBiometricsEnabled)) {
      throw new Error('Biometric authentication is not enabled.');
    }

    const key = await retrieveFromBiometricKeychain();

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, key),
    ]);

    // Attempt database decryption to see if key is valid
    try {
      await DatabaseAccess.instance();
    } catch (err) {
      await DatabaseAccess.lock();

      throw err;
    }
  }

  public static async enableBiometrics(): Promise<void> {
    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID);

    if (key === null) {
      throw new Error('The wallet must be unlocked to enable biometrics');
    }

    await storeInBiometricKeychain(key);
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, ENABLED);
  }

  public static async disableBiometrics(): Promise<void> {
    await resetBiometricKeychain();
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, DISABLED);
  }

  /**
   * This generates the key to unlock the wallet and stores it
   * in SecureStorage. Please adhere to these guidelines:
   *   1. Never store/persist the passphrase. It should only exist in input an
   *      the variable passed to this function.
   *   2. Never store the key generated in any place but SecureStorage
   */
  public static async unlock(passphrase: string): Promise<void> {
    if (await this.isUnlocked()) return;

    const key =  Crypto.pbkdf2Sync(
      passphrase,
      await DatabaseAccess.salt(),
      PBKDF2_ITERATIONS,
      32,
    );
    // each byte is 2 hex characters, reaching the necessary 64 characters
    // @ts-ignore
    const keyString = key.toString('hex');
    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, keyString),
    ]);

    // Attempt database decryption to see if key is valid
    try {
      await DatabaseAccess.instance();
    } catch (err) {
      await DatabaseAccess.lock();

      throw err;
    }
  }

  public static async lock(): Promise<void> {
    if (!(await this.isUnlocked())) return;

    if (DatabaseAccess.realm !== null) {
      DatabaseAccess.realm = null;
    }

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, ''),
    ]);
  }

  public static async isInitialized(): Promise<boolean> {
    /**
     * We can't use `Realm.exists` here because the config is
     * only available for the unlocked state.
     */
    return RNFS.exists(Realm.defaultPath);
  }

  /**
   * WARNING: Calling these two functions are destructive. They will wipe out the
   * existing salt and database.
   */
  public static async reset(): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) {
      throw new Error('Cannot reset unlocked wallet.');
    }

    await DatabaseAccess.disableBiometrics();

    await Promise.all([
      RNFS.unlink(`${Realm.defaultPath}.lock`),
      RNFS.unlink(`${Realm.defaultPath}.note`),
      RNFS.unlink(`${Realm.defaultPath}.management`),
      RNFS.unlink(Realm.defaultPath),
    ]);
  }

  public static async initialize(passphrase: string): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) {
      throw new Error('Cannot initialize unlocked wallet.');
    }

    if (await DatabaseAccess.isInitialized()) {
      throw new Error('Wallet must be in reset state to be initialized');
    }

    const decoder = new encoding.TextDecoder();
    const rawSalt = await generateSecureRandom(64);
    const salt: string = decoder.decode(rawSalt);

    await RNFS.writeFile(PBKDF2_SALT_PATH, salt, 'utf8');

    // The first call to unlock will create/encrypt the Realm with the pass
    await DatabaseAccess.unlock(passphrase);
    await DatabaseAccess.lock();
  }

  private static async encryptionKey(): Promise<Int8Array> {
    if (!(await this.isUnlocked())) {
      throw new Error('Wallet is not unlocked.');
    }

    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID);

    if (key === null) {
      throw new Error('Key not present in keychain.');
    }

    const encoder = new encoding.TextEncoder();
    const encodedBytes = new Int8Array(encoder.encode(key));
    return encodedBytes.slice(0, 64);
  }

  private static async salt(): Promise<string> {
    return RNFS.readFile(PBKDF2_SALT_PATH, 'utf8');
  }

  private static async config(): Promise<Realm.Configuration> {
    return {
      schema: models,
      schemaVersion,
      onMigration: runMigrations,
      encryptionKey: await DatabaseAccess.encryptionKey(),
    };
  }

  private static realm: Realm | null = null;
  private static async instance(): Promise<Realm> {
    if (DatabaseAccess.realm !== null) {
      return DatabaseAccess.realm;
    } else {
      return DatabaseAccess.realm = await Realm.open(await DatabaseAccess.config());
    }
  }
}

export {
  models,
  DatabaseAccess as db,
};
