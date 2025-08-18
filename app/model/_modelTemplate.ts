/**
 * Template for database objects.
 * Replace values:
 *   - Entity
 *   - entity
 */

import Realm from 'realm';
import { generateSecureRandom } from 'react-native-securerandom';
import { ObjectID} from 'bson';

import { db } from './';

export type EntityRecordRaw = {
  readonly _id: ObjectID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class EntityRecord implements EntityRecordRaw {
  readonly _id!: ObjectID;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'EntityRecord',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      createdAt: 'date',
      updatedAt: 'date',
    },
  };

  public asRaw(): EntityRecordRaw {
    return {
      _id: this._id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  public static async addEntityRecord(): Promise<void> { 
    const randomBytes = await generateSecureRandom(12);
    const _id = new ObjectID(Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join(''));
    const rawEntityRecord: EntityRecordRaw = {
      _id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.withInstance((instance) => {
      instance.write(() => {
        instance.create(EntityRecord.schema.name, rawEntityRecord);
      });
    });
  }

  public static async getAllEntityRecords(): Promise<EntityRecordRaw[]> {
    return db.withInstance((instance) => {
      const results = instance.objects<EntityRecord>(EntityRecord.schema.name);
      return results.length ? results.map((record) => record.asRaw()) : [];
    });
  }

  public static async deleteEntityRecords(rawEntityRecord: EntityRecordRaw): Promise<void> {
    await db.withInstance((instance) => {
      const objectId = new ObjectID(rawEntityRecord._id);
      const entityRecord = instance.objectForPrimaryKey(EntityRecord.schema.name, objectId);

      instance.write(() => {
        instance.delete(entityRecord);
      });
    });
  }
}
