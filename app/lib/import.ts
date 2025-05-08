import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';

import { ProfileRecord } from '../model';
import { CredentialImportReport } from '../types/credential';
import { Buffer } from '@craftzdog/react-native-buffer';

export type ReportDetails = Record<string, string[]>;

//identify PNG open badges by content
function isPngFile(base64: string): boolean {
  const header = Buffer.from(base64.substring(0, 24), 'base64').slice(0, 8);
  return header.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])); // PNG magic numbers
}

export async function readFile(path: string): Promise<string> {
  try {
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
        // Find start of the object
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
      // Assume it's a plain JSON/text file
      const decodedPath = path.replace(/%20/g, ' ');
      const fileContent = await RNFS.readFile(decodedPath, 'utf8');
      return fileContent;
    }
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
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