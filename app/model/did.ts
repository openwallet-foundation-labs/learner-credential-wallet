import Realm from 'realm';
import { randomBytes } from 'crypto';
const ObjectId = Realm.BSON.ObjectId;

// Generate a 12-byte ObjectId hex without relying on crypto.getRandomValues
let __OBJECT_ID_COUNTER = Math.floor(Math.random() * 0xffffff);
function generateObjectIdHex(): string {
  return randomBytes(12).toString('hex');
}

import { db } from './DatabaseAccess';
import { IDidDocument, IKeyAgreementKeyPair2020, IKeyPair } from '@digitalcredentials/ssi';
import { AddDidRecordParams } from '../lib/did';

export type DidRecordRaw = {
  readonly _id: Realm.BSON.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly rawDidDocument: string;
  readonly didDocument: IDidDocument;
  readonly rawVerificationKey: string;
  readonly verificationKey: IKeyPair;
  readonly rawKeyAgreementKey: string;
  readonly keyAgreementKey: IKeyAgreementKeyPair2020;
};
export class DidRecord extends Realm.Object implements DidRecordRaw {
  readonly _id!: Realm.BSON.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly rawDidDocument!: string;
  readonly rawVerificationKey!: string;
  readonly rawKeyAgreementKey!: string;

  get didDocument(): IDidDocument {
    return JSON.parse(this.rawDidDocument) as IDidDocument;
  }

  get verificationKey(): IKeyPair {
    return JSON.parse(this.rawVerificationKey) as IKeyPair;
  }

  get keyAgreementKey(): IKeyPair {
    return JSON.parse(this.rawKeyAgreementKey) as IKeyPair;
  }

  static schema: Realm.ObjectSchema = {
    name: 'DidRecord',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      createdAt: 'date',
      updatedAt: 'date',
      rawDidDocument: 'string',
      rawKeyAgreementKey: 'string',
      rawVerificationKey: 'string',
    },
  };

  asRaw(): DidRecordRaw {
    return {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      rawDidDocument: this.rawDidDocument,
      didDocument: this.didDocument,
      rawKeyAgreementKey: this.rawKeyAgreementKey,
      keyAgreementKey: this.keyAgreementKey,
      rawVerificationKey: this.rawVerificationKey,
      verificationKey: this.verificationKey,
    };
  }

// removed duplicate generator block; using generateObjectIdHex above

  static async addDidRecord({ didDocument, verificationKey, keyAgreementKey }: AddDidRecordParams): Promise<DidRecordRaw> {
    const _id = new ObjectId(generateObjectIdHex());
    const createdAt = new Date();
    const updatedAt = new Date();
    const rawDidDocument = JSON.stringify(didDocument);
    const rawVerificationKey = JSON.stringify(verificationKey);
    const rawKeyAgreementKey = JSON.stringify(keyAgreementKey);

    const rawDidRecordForRealm = {
      _id,
      createdAt,
      updatedAt,
      rawDidDocument,
      rawVerificationKey,
      rawKeyAgreementKey,
    };

    try {
      return await db.withInstance((instance) =>
        instance.write(() => {
          const created = instance.create<DidRecord>(DidRecord.schema.name, rawDidRecordForRealm);
          const result = created.asRaw();
          return result;
        })
      );
    } catch (error) {
      console.error('❌ Error creating DID record:', error);
      throw error;
    }
  }

  static getAllDidRecords(): Promise<DidRecordRaw[]> {
    return db.withInstance((instance) => {
      const results = instance.objects<DidRecord>(DidRecord.schema.name);
      return results.length ? results.map((record) => record.asRaw()) : [];
    });
  }

  static async deleteDidRecord(rawDidRecord: DidRecordRaw): Promise<void> {
    await db.withInstance((instance) => {
      const didRecord = instance.objectForPrimaryKey(DidRecord.schema.name, new ObjectId(rawDidRecord._id));

      instance.write(() => {
        if (didRecord) {
          instance.delete(didRecord);
        }
      });
    });
  }
}
