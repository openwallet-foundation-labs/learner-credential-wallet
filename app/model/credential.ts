import Realm from 'realm';
import { createHash, randomBytes } from 'crypto';

import { Credential, CredentialRecordEntry, CredentialRecordRaw } from '../types/credential';
import { db } from './DatabaseAccess';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

const ObjectId = Realm.BSON.ObjectId;
type ObjectId = Realm.BSON.ObjectId;

// Use native RNG for ObjectId to avoid crypto.getRandomValues path
function generateCredentialObjectIdHex(): string {
  return randomBytes(12).toString('hex');
}
export class CredentialRecord extends Realm.Object implements CredentialRecordRaw {
  readonly _id!: ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly rawCredential!: string;
  readonly profileRecordId!: ObjectId;

  get credential(): Credential {
    return JSON.parse(this.rawCredential) as Credential;
  }

  static schema: Realm.ObjectSchema = {
    name: 'CredentialRecord',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      createdAt: 'date',
      updatedAt: 'date',
      rawCredential: 'string',
      profileRecordId: 'objectId',
    },
  };

  asRaw(): CredentialRecordRaw {
    return {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      rawCredential: this.rawCredential,
      credential: this.credential,
      profileRecordId: this.profileRecordId,
    };
  }

  static entryFrom(record: CredentialRecordEntry): CredentialRecordEntry {
    return {
      _id: new ObjectId(record._id),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      rawCredential: record.rawCredential,
      profileRecordId: new ObjectId(record.profileRecordId),
    };
  }

  static rawFrom({ credential, profileRecordId }: AddCredentialRecordParams): CredentialRecordRaw {
    return {
      _id: new ObjectId(generateCredentialObjectIdHex()),
      createdAt: new Date(),
      updatedAt: new Date(),
      rawCredential: JSON.stringify(credential),
      credential,
      profileRecordId,
    };
  }

  static async addCredentialRecord(params: AddCredentialRecordParams): Promise<CredentialRecordRaw> {
    const rawCredentialRecord = CredentialRecord.rawFrom(params);

    return db.withInstance((instance) =>
      instance.write(() =>
        instance.create<CredentialRecord>(CredentialRecord.schema.name, rawCredentialRecord).asRaw(),
      ),
    );
  }

  static getAllCredentialRecords(): Promise<CredentialRecordRaw[]> {
    return db.withInstance((instance) => {
      const results = instance.objects<CredentialRecord>(CredentialRecord.schema.name);
      return results.length ? results.map((record) => record.asRaw()) : [];
    });
  }

  static async deleteCredentialRecord(rawCredentialRecord: CredentialRecordRaw): Promise<void> {
    await db.withInstance((instance) => {
      const credentialRecord = instance.objectForPrimaryKey(
        CredentialRecord.schema.name,
        new ObjectId(rawCredentialRecord._id),
      );

      instance.write(() => {
        if (credentialRecord) instance.delete(credentialRecord);
      });
    });
  }
}

export type AddCredentialRecordParams = {
  credential: IVerifiableCredential;
  profileRecordId: ObjectId;
};
