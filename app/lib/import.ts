import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';

import { ProfileRecord } from '../model';
import { CredentialImportReport } from '../types/credential';
import { Buffer } from '@craftzdog/react-native-buffer';

export type ReportDetails = Record<string, string[]>;

//identify PNG open badges by content
export function isPngFile(base64: string): boolean {
  const header = Buffer.from(base64.substring(0, 24), 'base64').slice(0, 8);
  return header.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])); // PNG magic numbers
}

export async function readFile(uri: string): Promise<string> {
  try {
    let path = uri;

    // On iOS, remove file:// prefix if present
    if (Platform.OS === 'ios' && path.startsWith('file://')) {
      path = path.replace('file://', '');
    }

    // Always read as base64 initially
    const base64Data = await RNFS.readFile(path, 'base64');

    if (isPngFile(base64Data)) {
      // Decode base64 to UTF-8 string for embedded JSON search
      const decodedString = Buffer.from(base64Data, 'base64').toString('utf8');

      // Search for keyword and extract the object following it
      const keyword = 'openbadgecredential';
      const keywordIndex = decodedString.indexOf(keyword);

      // Check if the keyword is found
      if (keywordIndex !== -1) {
        const startIndex = keywordIndex + keyword.length;
        const objectStart = decodedString.indexOf('{', startIndex);

        if (objectStart !== -1) {
          let braceCount = 0;
          let objectEnd = objectStart;

          while (objectEnd < decodedString.length) {
            if (decodedString[objectEnd] === '{') braceCount++;
            else if (decodedString[objectEnd] === '}') braceCount--;

            if (braceCount === 0) break;
            objectEnd++;
          }

          const objectString = decodedString.slice(objectStart, objectEnd + 1);
          try {
            const parsedObject = JSON.parse(objectString);
            return JSON.stringify(parsedObject, null, 2);
          } catch (error) {
            console.error('Failed to parse embedded OpenBadge JSON:', error);
            return '';
          }
        } else {
          console.warn('Could not locate start of JSON object');
          return '';
        }
      } else {
        console.log('OpenBadge keyword not found');
        return '';
      }
    } else {
      const fileContent = await RNFS.readFile(path, 'utf8');
      return fileContent;
    }
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
}

export async function pickAndReadFile(): Promise<string> {
  try {
    const file = await DocumentPicker.pickSingle({
      type: DocumentPicker.types.allFiles,
      copyTo: 'cachesDirectory',
    });

    let path: string | null = null;

    if (Platform.OS === 'ios') {
      path = file.fileCopyUri;
      if (!path) throw new Error('No fileCopyUri on iOS');
      path = decodeURI(path.replace('file://', ''));
    } else {
      path = file.uri;

      // If Android returns content:// URI, copy to accessible path
      if (path.startsWith('content://')) {
        const safeFileName = (file.name ?? 'imported_file').replace(/[^a-zA-Z0-9.-]/g, '_');
        const destPath = `${RNFS.TemporaryDirectoryPath}/${safeFileName}`;
        await RNFS.copyFile(path, destPath);
        path = destPath;
      } else {
        // Decode any encoded URI and remove file:// if present
        path = decodeURI(path.replace('file://', ''));
      }
    }

    const exists = await RNFS.exists(path);

    if (!exists) throw new Error(`File not found at ${path}`);

    return readFile(path);
  } catch (err) {
    console.error('pickAndReadFile error:', err);
    throw new Error('Unable to read selected file.');
  }
}

export function credentialReportDetailsFrom(report: CredentialImportReport): ReportDetails {
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

export function aggregateCredentialReports(reports: CredentialImportReport[]): CredentialImportReport {
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