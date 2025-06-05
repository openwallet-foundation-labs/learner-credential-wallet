import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import base64 from 'react-native-base64';

import { ProfileRecord } from '../model';
import { CredentialImportReport } from '../types/credential';

// Type augmentation for global object
declare global {
  // eslint-disable-next-line no-var
  var base64ToArrayBuffer: ((base64Str: string) => ArrayBuffer) | undefined;
}

// Local polyfill for base64ToArrayBuffer to avoid global dependency issues
if (typeof global.base64ToArrayBuffer !== 'function') {
  global.base64ToArrayBuffer = (base64Str: string) => {
    const decoded = base64.decode(base64Str);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes.buffer;
  };
}

export type ReportDetails = Record<string, string[]>;

export function base64ToArrayBuffer(base64Str: string): ArrayBuffer {
  const decoded = base64.decode(base64Str);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes.buffer;
}

// Identify PNG open badges by content
export function isPngFile(base64Str: string): boolean {
  try {
    // Read just enough base64 characters to get the PNG header (8 bytes)
    const base64Header = base64Str.substring(0, 24);
    const arrayBuffer = base64ToArrayBuffer(base64Header);
    const header = new Uint8Array(arrayBuffer).slice(0, 8);
    const pngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const isPng = pngMagic.every((b, i) => header[i] === b);

    return isPng;
  } catch (e) {
    return false;
  }
}

export async function readFile(uri: string): Promise<string> {
  try {
    let path = uri;

    if (Platform.OS === 'ios' && path.startsWith('file://')) {
      path = path.replace('file://', '');
    }
    // Read as base64 first
    const base64Data = await RNFS.readFile(path, 'base64');

    if (isPngFile(base64Data)) {
      // Decode base64 to UTF-8 string for embedded JSON extraction
      const decodedString = base64.decode(base64Data);

      // Search for the OpenBadge JSON inside PNG
      const keyword = 'openbadgecredential';
      const keywordIndex = decodedString.indexOf(keyword);

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
            return '';
          }
        } else {
          return '';
        }
      } else {
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

      if (path.startsWith('content://')) {
        // Sanitize filename by removing extra dots to avoid collision
        const safeFileName = (file.name ?? 'imported_file').replace(/[^a-zA-Z0-9]/g, '_');
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

    const content = await readFile(path);
    return content;
  } catch (err) {
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