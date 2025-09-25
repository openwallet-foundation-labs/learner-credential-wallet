import Realm from 'realm';
import { createHash, randomBytes } from 'crypto';
import uuid from 'react-native-uuid';

import { db } from './DatabaseAccess';

import { mintDid } from '../lib/did';
import { getCredentialName } from '../lib/credentialName';
import { UnlockedWallet } from '../types/wallet';
import { ProfileImportReport, ProfileMetadata } from '../types/profile';
import { parseWalletContents } from '../lib/parseWallet';
import { HumanReadableError } from '../lib/error';
import { CredentialRecord } from './credential';
import { DidRecord, DidRecordRaw } from './did';
import { CredentialRecordRaw } from '../types/credential';

const ObjectId = Realm.BSON.ObjectId;

// Generate a 12-byte ObjectId hex without relying on crypto.getRandomValues
let __PROFILE_OBJECT_ID_COUNTER = Math.floor(Math.random() * 0xffffff);
function generateProfileObjectIdHex(): string {
  return randomBytes(12).toString('hex');
}

const UNTITLED_PROFILE_NAME = 'Untitled Profile';
export const INITIAL_PROFILE_NAME = 'Default';

// Helper function to check if profile names are case-insensitively equal
function isProfileNameDuplicate(existingName: string, newName: string): boolean {
  return existingName.toLowerCase() === newName.toLowerCase();
}

export type ProfileRecordRaw = {
  readonly _id: Realm.BSON.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly profileName: string;
  readonly didRecordId: Realm.BSON.ObjectId;
};

export type ProfileWithCredentialRecords = ProfileRecordRaw & {
  rawCredentialRecords: CredentialRecordRaw[];
};

export class ProfileRecord extends Realm.Object implements ProfileRecordRaw {
  readonly _id!: Realm.BSON.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly profileName!: string;
  readonly didRecordId!: Realm.BSON.ObjectId;

  static schema: Realm.ObjectSchema = {
    name: 'ProfileRecord',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      createdAt: 'date',
      updatedAt: 'date',
      profileName: 'string',
      didRecordId: 'objectId',
    },
  };

  public asRaw(): ProfileRecordRaw {
    return {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      profileName: this.profileName,
      didRecordId: this.didRecordId,
    };
  }

  public static rawFrom({ profileName, rawDidRecord }: Required<AddProfileRecordParams>): ProfileRecordRaw {
    return {
      _id: new ObjectId(generateProfileObjectIdHex()),
      createdAt: new Date(),
      updatedAt: new Date(),
      profileName,
      didRecordId: new ObjectId(rawDidRecord._id),
    };
  }

  public static async addProfileRecord({ profileName, rawDidRecord }: AddProfileRecordParams): Promise<ProfileRecordRaw> {
    // Check for duplicate profile names (case-insensitive)
    const existingProfiles = await ProfileRecord.getAllProfileRecords();
    const isDuplicate = existingProfiles.some(profile => isProfileNameDuplicate(profile.profileName, profileName));
    
    if (isDuplicate) {
      throw new HumanReadableError(`A profile with the name "${profileName}" already exists. Please choose a different name.`);
    }

    if (rawDidRecord === undefined) {
      const didPayload = await mintDid();
      rawDidRecord = await DidRecord.addDidRecord(didPayload);
    }

    const rawProfileRecord = ProfileRecord.rawFrom({ profileName, rawDidRecord });

    return db.withInstance((instance) =>
      instance.write(() => {
        const created = instance.create<ProfileRecord>(ProfileRecord.schema.name, rawProfileRecord);
        const raw = created.asRaw();
        return raw;
      }),
    );
  }

  public static async getAllProfileRecords(): Promise<ProfileRecordRaw[]> {
    return db.withInstance((instance) => {
      const results = instance.objects<ProfileRecord>(ProfileRecord.schema.name);
      return results.length ? results.map((record) => record.asRaw()) : [];
    });
  }

  public static async updateProfileRecord(rawProfileRecord: ProfileRecordRaw): Promise<ProfileRecordRaw> {
    return db.withInstance((instance) =>
      instance.write(() =>
        instance.create<ProfileRecord>(ProfileRecord.schema.name, rawProfileRecord, Realm.UpdateMode.Modified).asRaw(),
      ),
    );
  }

  public static async deleteProfileRecord(rawProfileRecord: ProfileRecordRaw): Promise<void> {
    const rawProfileRecords = await ProfileRecord.getAllProfileRecords();
    if (rawProfileRecords.length <= 1) {
      throw new HumanReadableError(
        'You are unable to delete this profile as your wallet must have at least one profile. If you want to delete the contents of your wallet, please select Reset Wallet from the Settings Menu.',
      );
    }

    await db.withInstance(async (instance) => {
      const profileRecord = instance.objectForPrimaryKey<ProfileRecord>(ProfileRecord.schema.name, new ObjectId(rawProfileRecord._id));
      if (profileRecord == null) throw new Error('Profile not found');

      const didRecord = instance.objectForPrimaryKey<DidRecord>(DidRecord.schema.name, new ObjectId(profileRecord.didRecordId));
      const credentialRecordIds = (await CredentialRecord.getAllCredentialRecords()).filter(({ profileRecordId }) =>
        profileRecordId.equals(rawProfileRecord._id),
      );
      const credentialRecords = credentialRecordIds.map(({ _id }) =>
        instance.objectForPrimaryKey<CredentialRecord>(CredentialRecord.schema.name, new ObjectId(_id)),
      );

      instance.write(() => {
        instance.delete(profileRecord);
        if (didRecord) instance.delete(didRecord);
        credentialRecords.forEach((record) => record && instance.delete(record));
      });
    });
  }

  public static async exportProfileRecord(rawProfileRecord: ProfileRecordRaw): Promise<UnlockedWallet> {
    const { profileName } = rawProfileRecord;

    const allCredentialRecords = await CredentialRecord.getAllCredentialRecords();
    const profileCredentialRecords = allCredentialRecords.filter(({ profileRecordId }) =>
      profileRecordId.equals(rawProfileRecord._id),
    );
    const credentials = profileCredentialRecords.map(({ credential }) => credential);

    const allDidRecords = await DidRecord.getAllDidRecords();
    const profileDidRecord = allDidRecords.find(({ _id }) => _id.equals(rawProfileRecord.didRecordId));

    if (profileDidRecord === undefined) {
      throw new Error('No DID record found for profile');
    }

    const { didDocument, verificationKey, keyAgreementKey } = profileDidRecord;

    const profileMetadata: ProfileMetadata = {
      '@context': ['https://w3id.org/wallet/v1'],
      id: `urn:uuid:${uuid.v4()}`,
      type: 'ProfileMetadata',
      data: {
        profileName,
      },
    };

    const contents = [
      ...credentials,
      didDocument,
      verificationKey,
      keyAgreementKey,
      profileMetadata,
    ];

    const profile: UnlockedWallet = {
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/wallet/v1'],
      id: 'http://example.gov/wallet/3732',
      type: 'UniversalWallet2020',
      status: 'UNLOCKED',
      contents,
    };

    return profile;
  }

  public static async importProfileRecord(rawWallet: string): Promise<ProfileImportReport> {
    const { credentials, didDocument, verificationKey, keyAgreementKey, profileMetadata } = parseWalletContents(rawWallet);

    const profileImportReport: ProfileImportReport = {
      userIdImported: false,
      profileDuplicate: false,
      credentials: {
        success: [],
        duplicate: [],
        failed: [],
      },
    };

    try {
      const { profileName = UNTITLED_PROFILE_NAME } = profileMetadata?.data ?? {};
      
      // Check if profile with same name already exists (case-insensitive)
      const existingProfiles = await ProfileRecord.getAllProfileRecords();
      const existingProfile = existingProfiles.find(profile => isProfileNameDuplicate(profile.profileName, profileName));
      
      if (existingProfile) {
        // Skip profile creation but still process credentials for existing profile
        const profileRecordId = existingProfile._id;
        profileImportReport.userIdImported = false; // Profile already exists
        profileImportReport.profileDuplicate = true;
        
        const existingCredentials = await CredentialRecord.getAllCredentialRecords();
        const profileCredentialIds = existingCredentials
          .filter(({ profileRecordId: credProfileId }) => credProfileId.equals(profileRecordId))
          .map(({ credential }) => credential.id);

        await Promise.all(
          credentials.map(async (credential) => {
            const credentialName = getCredentialName(credential);
            if (profileCredentialIds.includes(credential.id)) {
              profileImportReport.credentials.duplicate.push(credentialName);
              return;
            }

            try {
              await CredentialRecord.addCredentialRecord({ credential, profileRecordId });
              profileImportReport.credentials.success.push(credentialName);
            } catch (err) {
              console.warn(`Unable to import credential: ${err}`);
              profileImportReport.credentials.failed.push(credentialName);
            }
          }),
        );
        
        return profileImportReport;
      }

      const rawDidRecord = await DidRecord.addDidRecord({ didDocument, verificationKey, keyAgreementKey });
      const rawProfileRecord = await ProfileRecord.addProfileRecord({ profileName, rawDidRecord });
      const profileRecordId = rawProfileRecord._id;

      profileImportReport.userIdImported = true;

      await Promise.all(
        credentials.map(async (credential) => {
          const credentialName = getCredentialName(credential);

          try {
            await CredentialRecord.addCredentialRecord({ credential, profileRecordId });
            profileImportReport.credentials.success.push(credentialName);
          } catch (err) {
            console.warn(`Unable to import credential: ${err}`);
            profileImportReport.credentials.failed.push(credentialName);
          }
        }),
      );
    } catch (err) {
      console.warn(`Unable to import profile: ${err}`);
    }

    return profileImportReport;
  }
}

export type AddProfileRecordParams = {
  profileName: string;
  rawDidRecord?: DidRecordRaw;
};
