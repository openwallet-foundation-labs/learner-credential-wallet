import { ProfileRecord } from '../app/model/profile';
import { HumanReadableError } from '../app/lib/error';

// Mock the database and dependencies
jest.mock('../app/model/DatabaseAccess');
jest.mock('../app/lib/did');
jest.mock('../app/model/did');
jest.mock('../app/lib/parseWallet');

describe('Profile Duplicate Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addProfileRecord', () => {
    it('should throw error when profile name already exists', async () => {
      // Mock existing profiles
      const mockExistingProfiles = [
        { profileName: 'Test Profile', _id: 'id1' },
        { profileName: 'Another Profile', _id: 'id2' }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);

      await expect(
        ProfileRecord.addProfileRecord({ profileName: 'Test Profile' })
      ).rejects.toThrow(HumanReadableError);
      
      await expect(
        ProfileRecord.addProfileRecord({ profileName: 'Test Profile' })
      ).rejects.toThrow('A profile with the name "Test Profile" already exists');
    });

    it('should throw error when profile name already exists with different case', async () => {
      // Mock existing profiles
      const mockExistingProfiles = [
        { profileName: 'Test Profile', _id: 'id1' },
        { profileName: 'Another Profile', _id: 'id2' }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);

      // Test various case combinations
      await expect(
        ProfileRecord.addProfileRecord({ profileName: 'test profile' })
      ).rejects.toThrow(HumanReadableError);
      
      await expect(
        ProfileRecord.addProfileRecord({ profileName: 'TEST PROFILE' })
      ).rejects.toThrow(HumanReadableError);
      
      await expect(
        ProfileRecord.addProfileRecord({ profileName: 'TeSt PrOfIlE' })
      ).rejects.toThrow(HumanReadableError);
      
      await expect(
        ProfileRecord.addProfileRecord({ profileName: 'test profile' })
      ).rejects.toThrow('A profile with the name "test profile" already exists');
    });

    it('should allow creating profile with unique name', async () => {
      const mockExistingProfiles = [
        { profileName: 'Existing Profile', _id: 'id1' }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);
      
      // Mock the database write operation
      const mockRawProfile = { profileName: 'New Profile', _id: 'newId' };
      jest.spyOn(ProfileRecord, 'rawFrom').mockReturnValue(mockRawProfile as any);
      
      // This should not throw
      expect(async () => {
        await ProfileRecord.addProfileRecord({ profileName: 'New Profile' });
      }).not.toThrow();
    });
  });

  describe('importProfileRecord', () => {
    it('should skip profile creation when profile name already exists', async () => {
      const mockExistingProfiles = [
        { profileName: 'Existing Profile', _id: 'existingId' }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);
      
      // Mock parseWalletContents to return the required wallet contents
      const { parseWalletContents } = require('../app/lib/parseWallet');
      parseWalletContents.mockReturnValue({
        credentials: [],
        didDocument: { id: 'did:example:123' },
        verificationKey: { type: 'Ed25519VerificationKey2020' },
        keyAgreementKey: { type: 'X25519KeyAgreementKey2020' },
        profileMetadata: {
          data: { profileName: 'Existing Profile' }
        }
      });
      
      const mockWalletData = '{}'; // The actual content doesn't matter since we're mocking parseWalletContents
      
      // The import should mark profile as duplicate
      const result = await ProfileRecord.importProfileRecord(mockWalletData);
      
      expect(result.userIdImported).toBe(false);
      expect(result.profileDuplicate).toBe(true);
    });

    it('should skip profile creation when profile name already exists with different case', async () => {
      const mockExistingProfiles = [
        { profileName: 'Existing Profile', _id: 'existingId' }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);
      
      // Mock parseWalletContents to return the required wallet contents
      const { parseWalletContents } = require('../app/lib/parseWallet');
      parseWalletContents.mockReturnValue({
        credentials: [],
        didDocument: { id: 'did:example:123' },
        verificationKey: { type: 'Ed25519VerificationKey2020' },
        keyAgreementKey: { type: 'X25519KeyAgreementKey2020' },
        profileMetadata: {
          data: { profileName: 'existing profile' }
        }
      });
      
      const mockWalletData = '{}'; // The actual content doesn't matter since we're mocking parseWalletContents
      
      // The import should mark profile as duplicate even with different case
      const result = await ProfileRecord.importProfileRecord(mockWalletData);
      
      expect(result.userIdImported).toBe(false);
      expect(result.profileDuplicate).toBe(true);
    });
  });
});