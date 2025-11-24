import Realm from 'realm'
import { ObjectID } from 'bson'

type Migration = (oldRealm: Realm, newRealm: Realm) => void | Promise<void>

export async function runMigrations(
  oldRealm: Realm,
  newRealm: Realm
): Promise<void> {
  console.log(
    `Migrating schema version from ${oldRealm.schemaVersion} → ${schemaVersion}`
  )
  for (const [i, migration] of Object.entries(migrations)) {
    const migrationVersion = Number(i) + 1
    if (oldRealm.schemaVersion < migrationVersion) {
      console.log(`Running migration ${migrationVersion}: ${migration.name}`)
      await migration(oldRealm, newRealm)
    }
  }
}

function asRaw<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Migration-specific types for schema evolution
type MigrationDidRecord = {
  _id: Realm.BSON.ObjectId
  createdAt: Date
  updatedAt: Date
  rawDidDocument: string
  rawVerificationKey: string
  rawKeyAgreementKey: string
}

type MigrationCredentialRecord = {
  _id: Realm.BSON.ObjectId
  createdAt: Date
  updatedAt: Date
  rawCredential: string
}

// Convert migration credential to expected entry type
function toCredentialEntry(
  migrationRecord: MigrationCredentialRecord,
  profileRecordId: Realm.BSON.ObjectId
): import('../types/credential').CredentialRecordEntry {
  return {
    _id: new ObjectID(migrationRecord._id.toHexString()),
    createdAt: migrationRecord.createdAt,
    updatedAt: migrationRecord.updatedAt,
    rawCredential: migrationRecord.rawCredential,
    profileRecordId: new ObjectID(profileRecordId.toHexString())
  }
}

// Convert migration types to expected types
function toDidRecordRaw(
  migrationRecord: MigrationDidRecord
): import('./did').DidRecordRaw {
  return {
    _id: migrationRecord._id,
    createdAt: migrationRecord.createdAt,
    updatedAt: migrationRecord.updatedAt,
    rawDidDocument: migrationRecord.rawDidDocument,
    didDocument: JSON.parse(migrationRecord.rawDidDocument),
    rawVerificationKey: migrationRecord.rawVerificationKey,
    verificationKey: JSON.parse(migrationRecord.rawVerificationKey),
    rawKeyAgreementKey: migrationRecord.rawKeyAgreementKey,
    keyAgreementKey: JSON.parse(migrationRecord.rawKeyAgreementKey)
  }
}

const m1_createDefaultProfileAndAssociateExistingCredentials: Migration =
  async (_, newRealm) => {
    const { DidRecord } = await import('./did')
    const { ProfileRecord } = await import('./profile')
    const { CredentialRecord } = await import('./credential')

    const didRecord = newRealm.objects(DidRecord.schema.name)[0]
    const migrationDidRecord: MigrationDidRecord = {
      _id: didRecord._id as Realm.BSON.ObjectId,
      createdAt: didRecord.createdAt as Date,
      updatedAt: didRecord.updatedAt as Date,
      rawDidDocument: didRecord.rawDidDocument as string,
      rawVerificationKey: didRecord.rawVerificationKey as string,
      rawKeyAgreementKey: didRecord.rawKeyAgreementKey as string
    }
    const rawDidRecord = toDidRecordRaw(migrationDidRecord)
    const rawProfileRecord = ProfileRecord.rawFrom({
      profileName: 'Default',
      rawDidRecord
    })
    const profileRecordId = rawProfileRecord._id

    newRealm.create(ProfileRecord.schema.name, rawProfileRecord)

    const credentialRecords = newRealm.objects(CredentialRecord.schema.name)

    credentialRecords.forEach((credentialRecord) => {
      const migrationCredentialRecord: MigrationCredentialRecord = {
        _id: credentialRecord._id as Realm.BSON.ObjectId,
        createdAt: credentialRecord.createdAt as Date,
        updatedAt: credentialRecord.updatedAt as Date,
        rawCredential: credentialRecord.rawCredential as string
      }
      const credentialEntry = CredentialRecord.entryFrom(
        toCredentialEntry(migrationCredentialRecord, profileRecordId)
      )
      newRealm.create(
        CredentialRecord.schema.name,
        credentialEntry,
        Realm.UpdateMode.Modified
      )
    })
  }

const migrations = [m1_createDefaultProfileAndAssociateExistingCredentials]

export const schemaVersion = migrations.length
