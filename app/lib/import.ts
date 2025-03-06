import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';

import { ProfileRecord } from '../model';
import { CredentialImportReport } from '../types/credential';
import { Buffer } from '@craftzdog/react-native-buffer';

export type ReportDetails = Record<string, string[]>;

export async function readFile(path: string): Promise<string> {
  let fileContent: string = '';
  let openBadgeCredential = '';
  try {
    // Extract the file extension from the resolved/provided path
    const fileExtension = getFileExtension(path);

    if (fileExtension === 'png') {    
      // Read the PNG file as base64
      const base64Image = await RNFS.readFile(path, 'base64');
            
      const decodedString = Buffer.from(base64Image, 'base64').toString('utf8');
      
      // Search for keyword and extract the object following it
      const keyword = 'openbadgecredential';  
      const keywordIndex = decodedString.indexOf(keyword);

      // Check if the keyword is found
      if (keywordIndex !== -1) {
        // Extract the portion of the string after the keyword
        const startIndex = keywordIndex + keyword.length;

        // Find start of the object
        const objectStart = decodedString.indexOf('{', startIndex);

        if (objectStart !== -1) {
          // Find matching closing brace
          let braceCount = 0;
          let objectEnd = objectStart;

          while (objectEnd < decodedString.length) {
            if (decodedString[objectEnd] === '{') {
              braceCount++;
            } else if (decodedString[objectEnd] === '}') {
              braceCount--;
            }

            // When brace count goes back to zero = found the end of object
            if (braceCount === 0) {
              break;
            }

            objectEnd++;
          }
          
          const objectString = decodedString.slice(objectStart, objectEnd + 1);

          // Parse object
          try {
            const parsedObject = JSON.parse(objectString);
            openBadgeCredential = JSON.stringify(parsedObject, null, 2);
          } catch (error) {
            console.error('Failed to parse JSON:', error);
          }
        } 
      } else {
        console.log('Keyword not found');
      }

      fileContent = openBadgeCredential;

    } else {
      // For other file types (text, etc.), read as UTF-8
      const decodedPath = path.replace(/%20/g, ' ');
      fileContent = await RNFS.readFile(decodedPath, 'utf8');
    }

  } catch (error) {
    console.error('Error reading file:', error);
    fileContent = '';  // Handle error, fallback value
  }

  if (fileContent === undefined) {
    throw new Error('File content could not be determined');
  }

  return fileContent;
}

// Utility function to extract file extension
function getFileExtension(path: string): string {
  // Check if the path ends with a file extension like ".png"
  const regex = /(?:\.([^.]+))?$/;
  const match = path.match(regex);
  if (match && match[1]) {
    return match[1].toLowerCase(); // Return the extension in lowercase (e.g., png, jpg)
  }
  return ''; // If no extension found, return an empty string
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
