import Realm from 'realm';
import { CredentialRecord } from './credential';
import { DidRecord, DidRecordRaw } from './did';
import { ProfileRecord } from './profile';

type Migration = (oldRealm: Realm, newRealm: Realm) => void;

export async function runMigrations(oldRealm: Realm, newRealm: Realm): Promise<void> {
  console.log(`Migrating schema version from ${oldRealm.schemaVersion} → ${schemaVersion}`);
  for (const [i, migration] of Object.entries(migrations)) {
    const migrationVersion = Number(i) + 1;
    if (oldRealm.schemaVersion < migrationVersion) {
      console.log(`Running migration ${migrationVersion}: ${migration.name}`);
      await migration(oldRealm, newRealm);
    }
  }
}

function asRaw<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const m1_createDefaultProfileAndAssociateExistingCredentials: Migration = (_, newRealm) => {  
  const didRecord = newRealm.objects<DidRecord>(DidRecord.schema.name)[0];
  const rawDidRecord = asRaw<DidRecordRaw>(didRecord);
  const rawProfileRecord = ProfileRecord.rawFrom({ profileName: 'Default', rawDidRecord });
  const profileRecordId = rawProfileRecord._id; 

  newRealm.create(ProfileRecord.schema.name, rawProfileRecord);

  const credentialRecords = newRealm.objects<CredentialRecord>(CredentialRecord.schema.name);

  credentialRecords.forEach((credentialRecord) => {
    const rawCredentialRecord = asRaw<CredentialRecord>(credentialRecord);
    const credentialEntry = CredentialRecord.entryFrom({ ...rawCredentialRecord, profileRecordId });
    newRealm.create(CredentialRecord.schema.name, credentialEntry, Realm.UpdateMode.Modified);
  }); 
};

const migrations = [
  m1_createDefaultProfileAndAssociateExistingCredentials,
];

export const schemaVersion = migrations.length;
