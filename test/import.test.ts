import { readFile, pickAndReadFile, importProfileFrom, importWalletFrom, importWalletOrProfileFrom } from '../app/lib/import';
import DocumentPicker from 'react-native-document-picker';
import * as RNFS from 'react-native-fs';
import { ProfileRecord } from '../app/model';

jest.mock('react-native-document-picker', () => ({
  pickSingle: jest.fn(),
  types: {
    allFiles: 'allFiles',
  },
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
}));

jest.mock('@craftzdog/react-native-buffer', () => ({
  Buffer: {
    from: jest.fn(),
  },
}));

jest.mock('../app/model', () => ({
  ProfileRecord: {
    importProfileRecord: jest.fn(),
  },
}));

describe('import.ts', () => {
  describe('readFile', () => {
    it('should read a text file as UTF-8', async () => {
      const mockPath = 'path/to/file.txt';
      const mockContent = 'file content';
      (RNFS.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await readFile(mockPath);

      expect(result).toBe(mockContent);
    });

    it('should handle errors gracefully', async () => {
      const mockPath = 'path/to/file.txt';
      (RNFS.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

      const result = await readFile(mockPath);

      expect(result).toBe('');
    });
  });

  describe('pickAndReadFile', () => {
    it('should pick a file and read its content', async () => {
      const mockUri = 'path/to/file.txt';
      const mockContent = 'file content';
      (DocumentPicker.pickSingle as jest.Mock).mockResolvedValue({ uri: mockUri });
      (RNFS.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await pickAndReadFile();

      expect(result).toBe(mockContent);
    });
  });

  describe('importProfileFrom', () => {
    it('should import profile and return report details', async () => {
      const mockData = '{"key": "value"}';
      const mockReport = {
        userIdImported: true,
        credentials: {
          success: [],
          duplicate: [],
          failed: [],
        },
      };
      (ProfileRecord.importProfileRecord as jest.Mock).mockResolvedValue(mockReport);

      const result = await importProfileFrom(mockData);

      expect(result).toEqual({
        'User ID successfully imported': [],
      });
    });
  });

  describe('importWalletOrProfileFrom', () => {
    it('should import profile if data is an object', async () => {
      const mockData = '{"key": "value"}';
      const mockReport = {
        userIdImported: true,
        credentials: {
          success: [],
          duplicate: [],
          failed: [],
        },
      };
      (ProfileRecord.importProfileRecord as jest.Mock).mockResolvedValue(mockReport);

      const result = await importWalletOrProfileFrom(mockData);

      expect(result).toEqual({
        'User ID successfully imported': [],
      });
    });
  });
});