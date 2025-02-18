import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';

import { ProfileRecord } from '../model';
import { CredentialImportReport } from '../types/credential';

export type ReportDetails = Record<string, string[]>;

export async function readFile(path: string): Promise<string> {
  const decodedPath = path.replace(/%20/g, ' ');
  return RNFS.readFile(decodedPath, 'utf8');
}

export async function pickAndReadFile(): Promise<string> {
  const { uri } = await DocumentPicker.pickSingle({
    type: DocumentPicker.types.allFiles,
  });

  return readFile(uri);
}

function credentialReportDetailsFrom(report: CredentialImportReport): ReportDetails {
  const sectionText: Record<string, (n: number, s: string) => string> = {
    success: (n, s) => `${n} item${s} successfully imported`,
    duplicate: (n, s) => `${n} duplicate item${s} ignored`,
    failed: (n, s) => `${n} item${s} failed to complete`,
  };

  return Object.fromEntries<string[]>(
    Object.entries(report)
      .filter(([, value]) => value.length > 0)
      .map(([key, value]) => {
        const plural = value.length !== 1 ? 's' : '';
        const headerText = sectionText[key](value.length, plural);

        return [headerText, value];
      }),
  );
}

function aggregateCredentialReports(reports: CredentialImportReport[]): CredentialImportReport {
  return reports.reduce((prevValue, curValue) => ({
    success: prevValue.success.concat(curValue.success),
    duplicate: prevValue.duplicate.concat(curValue.duplicate),
    failed: prevValue.failed.concat(curValue.failed),
  }));
}

export async function importProfileFrom(data: string): Promise<ReportDetails> {
  const profileImportReport = await ProfileRecord.importProfileRecord(data);
  const userIdStatusText = `User ID ${profileImportReport.userIdImported ? 'successfully imported' : 'failed to import'}`;
  const reportDetails = {
    [userIdStatusText]: [],
    ...credentialReportDetailsFrom(profileImportReport.credentials),
  };

  return reportDetails;
}

export async function importWalletFrom(data: string): Promise<ReportDetails> {
  const items: unknown[] = JSON.parse(data);

  const reports = await Promise.all(items.map(async (item) => {
    const rawWallet = JSON.stringify(item);
    return ProfileRecord.importProfileRecord(rawWallet);
  }));

  const credentialReports = reports.map(({ credentials }) => credentials);
  const totalCredentialsReport = aggregateCredentialReports(credentialReports);
  const reportDetails = credentialReportDetailsFrom(totalCredentialsReport);

  return reportDetails;
}

export async function importWalletOrProfileFrom(data: string): Promise<ReportDetails> {
  const parsedData = JSON.parse(data);

  if (parsedData instanceof Array) {
    return importWalletFrom(data);
  }

  return importProfileFrom(data);
}
