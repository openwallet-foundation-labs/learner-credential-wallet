import { CredentialImportReport } from './credential';

export type ProfileImportReport = {
  userIdImported: boolean;
  profileDuplicate?: boolean;
  credentials: CredentialImportReport;
  profileName?: string;
};

export type ProfileMetadata = {
  '@context': string[];
  id: string;
  type: 'ProfileMetadata';
  data: {
    profileName: string;
  }
}
