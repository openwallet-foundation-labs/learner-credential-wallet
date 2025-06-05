import {
  isPngFile,
  readFile,
  pickAndReadFile,
  importProfileFrom,
  importWalletFrom,
  importWalletOrProfileFrom,
  aggregateCredentialReports,
  credentialReportDetailsFrom,
} from '../app/lib/import';

import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';
import { ProfileRecord } from '../app/model/profile';
import { Buffer } from '@craftzdog/react-native-buffer';
import { Platform } from 'react-native';

jest.mock('react-native-document-picker', () => ({
  pickSingle: jest.fn(),
  types: {
    allFiles: '*/*',
  },
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  exists: jest.fn().mockResolvedValue(true),
  copyFile: jest.fn().mockResolvedValue(undefined),
  TemporaryDirectoryPath: '/tmp',
}));

jest.mock('../app/model/profile', () => ({
  ProfileRecord: {
    importProfileRecord: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
}));

describe('Utility Functions', () => {
  describe('isPngFile', () => {
    it('should return true for valid PNG base64', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString('base64');
      const result = isPngFile(pngHeader + 'restofbase64');
      expect(result).toBe(true);
    });

    it('should return false for non-PNG base64', () => {
      const fakeHeader = Buffer.from('notapngfileheader').toString('base64');
      expect(isPngFile(fakeHeader)).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should return parsed embedded JSON from PNG file', async () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const embeddedJson = JSON.stringify({ openbadgecredential: { name: 'Test' } });
      const content = Buffer.concat([
        pngHeader,
        Buffer.from(`randomtextopenbadgecredential${embeddedJson}`),
      ]).toString('base64');

      (RNFS.readFile as jest.Mock).mockResolvedValueOnce(content);

      const result = await readFile('fakepath');
      expect(JSON.parse(result)).toHaveProperty('openbadgecredential.name', 'Test');
    });

    it('should return plain content for non-PNG file', async () => {
      (RNFS.readFile as jest.Mock)
        .mockResolvedValueOnce('notapng') // base64
        .mockResolvedValueOnce('{"key":"value"}'); // utf8 fallback

      const result = await readFile('file.json');
      expect(JSON.parse(result)).toHaveProperty('key', 'value');
    });
  });

  describe('pickAndReadFile', () => {
      const originalPlatform = Platform.OS;

      afterEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: originalPlatform,
        });
      });

      it('should pick and read a content:// file on Android', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'android' });

        (DocumentPicker.pickSingle as jest.Mock).mockResolvedValueOnce({
          uri: 'content://some/file.json',
          name: 'badge file (1).json',
        });

        (RNFS.readFile as jest.Mock)
          .mockResolvedValueOnce('notapng') // base64
          .mockResolvedValueOnce('{"android": "content"}');

        const result = await pickAndReadFile();
        expect(RNFS.copyFile).toHaveBeenCalled();
        expect(result).toContain('content');
      });
      
      it('should pick and read a file on Android', async () => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
        });

        const fakeUri = 'file://test.json';

        (DocumentPicker.pickSingle as jest.Mock).mockResolvedValueOnce({
          uri: fakeUri,
          name: 'test.json',
        });

        (RNFS.readFile as jest.Mock)
          .mockResolvedValueOnce('notapng') // base64
          .mockResolvedValueOnce('{"android":true}');

        const result = await pickAndReadFile();
        expect(result).toContain('true');
      });

      it('should pick and read a file on iOS', async () => {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
        });

        const fakeUri = 'file://test.json';

        (DocumentPicker.pickSingle as jest.Mock).mockResolvedValueOnce({
          uri: fakeUri,
          fileCopyUri: fakeUri,
          name: 'test.json',
        });

        (RNFS.readFile as jest.Mock)
          .mockResolvedValueOnce('notapng') // base64
          .mockResolvedValueOnce('{"ios":true}');

        const result = await pickAndReadFile();
        expect(result).toContain('true');
      });

    it('should pick a file and read it', async () => {
      const fakeUri = 'file://test.json';

      (DocumentPicker.pickSingle as jest.Mock).mockResolvedValueOnce({
        uri: fakeUri,
        fileCopyUri: fakeUri, // Add this!
        name: 'test.json',
      });

      (RNFS.readFile as jest.Mock)
        .mockResolvedValueOnce('notapng') // base64
        .mockResolvedValueOnce('{"test":123}'); // utf8 fallback

      const result = await pickAndReadFile();
      expect(result).toContain('123');
    });
  });

  describe('importProfileFrom', () => {
    it('should process profile import', async () => {
      (ProfileRecord.importProfileRecord as jest.Mock).mockResolvedValueOnce({
        userIdImported: true,
        credentials: {
          success: ['a'],
          duplicate: [],
          failed: [],
        },
      });

      const report = await importProfileFrom('{}');
      expect(report).toHaveProperty('User ID successfully imported');
      expect(report).toHaveProperty('1 item successfully imported');
    });
  });

  describe('importWalletFrom', () => {
    it('should process wallet import with multiple records', async () => {
      (ProfileRecord.importProfileRecord as jest.Mock)
        .mockResolvedValueOnce({
          userIdImported: true,
          credentials: { success: ['1'], duplicate: [], failed: [] },
        })
        .mockResolvedValueOnce({
          userIdImported: true,
          credentials: { success: [], duplicate: ['2'], failed: [] },
        });

      const json = JSON.stringify([{ id: 1 }, { id: 2 }]);
      const report = await importWalletFrom(json);

      expect(report).toHaveProperty('1 item successfully imported');
      expect(report).toHaveProperty('1 duplicate item ignored');
    });
  });

  describe('importWalletOrProfileFrom', () => {
    it('should call wallet import for an array', async () => {
      const spy = jest.spyOn(ProfileRecord, 'importProfileRecord').mockResolvedValue({
        userIdImported: true,
        credentials: { success: ['x'], duplicate: [], failed: [] },
      });

      const result = await importWalletOrProfileFrom(JSON.stringify([{}]));
      expect(result).toHaveProperty('1 item successfully imported');
      expect(spy).toHaveBeenCalled();
    });

    it('should call profile import for an object', async () => {
      const spy = jest.spyOn(ProfileRecord, 'importProfileRecord').mockResolvedValue({
        userIdImported: true,
        credentials: { success: [], duplicate: ['a'], failed: ['b'] },
      });

      const result = await importWalletOrProfileFrom(JSON.stringify({}));
      expect(result).toHaveProperty('1 duplicate item ignored');
      expect(result).toHaveProperty('1 item failed to complete');
    });
  });

  describe('aggregateCredentialReports', () => {
    it('should aggregate multiple reports', () => {
      const reports = [
        { success: ['1'], duplicate: ['2'], failed: [] },
        { success: [], duplicate: ['3'], failed: ['4'] },
      ];

      const result = aggregateCredentialReports(reports);
      expect(result.success).toHaveLength(1);
      expect(result.duplicate).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('credentialReportDetailsFrom', () => {
    it('should format credential sections properly', () => {
      const details = credentialReportDetailsFrom({
        success: ['1', '2'],
        duplicate: ['3'],
        failed: [],
      });

      expect(Object.keys(details)).toEqual([
        '2 items successfully imported',
        '1 duplicate item ignored',
      ]);
    });
  });
});
