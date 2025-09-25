import { ProfileRecord } from '../app/model/profile';
import { HumanReadableError } from '../app/lib/error';
import { CredentialRecord } from '../app/model/credential';

// Mock the database and dependencies
jest.mock('../app/model/DatabaseAccess');
jest.mock('../app/lib/did');
jest.mock('../app/model/did');
jest.mock('../app/model/credential');

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
      
      // Mock the database operations
      const { db } = require('../app/model/DatabaseAccess');
      const mockRawProfile = { profileName: 'New Profile', _id: 'newId' };
      db.withInstance.mockImplementation((callback: any) => {
        const mockInstance = {
          write: (writeCallback: any) => writeCallback(),
          create: () => ({ asRaw: () => mockRawProfile })
        };
        return callback(mockInstance);
      });
      
      // Mock mintDid and DidRecord.addDidRecord
      const { mintDid } = require('../app/lib/did');
      const { DidRecord } = require('../app/model/did');
      mintDid.mockResolvedValue({ didDocument: {}, verificationKey: {}, keyAgreementKey: {} });
      DidRecord.addDidRecord.mockResolvedValue({ _id: '507f1f77bcf86cd799439011' }); // Valid 24-char hex ObjectId
      
      const result = await ProfileRecord.addProfileRecord({ profileName: 'New Profile' });
      expect(result.profileName).toBe('New Profile');
    });
  });

  describe('importProfileRecord', () => {
    it('should skip profile creation when profile name already exists', async () => {
      const mockExistingProfiles = [
        { profileName: 'Existing Profile', _id: { equals: () => true } }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);
      jest.spyOn(CredentialRecord, 'getAllCredentialRecords').mockResolvedValue([]);
      jest.spyOn(CredentialRecord, 'addCredentialRecord').mockResolvedValue({} as any);
      
      const mockWalletData = JSON.stringify({
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/wallet/v1'],
        type: 'UniversalWallet2020',
        contents: [
          {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: 'did:example:123'
          },
          {
            type: 'Ed25519VerificationKey2020',
            id: 'key1'
          },
          {
            type: 'X25519KeyAgreementKey2020', 
            id: 'key2'
          },
          {
            type: 'ProfileMetadata',
            data: { profileName: 'Existing Profile' }
          }
        ]
      });
      
      // The import should mark profile as duplicate
      const result = await ProfileRecord.importProfileRecord(mockWalletData);
      
      expect(result.userIdImported).toBe(false);
      expect(result.profileDuplicate).toBe(true);
    });

    it('should skip profile creation when profile name already exists with different case', async () => {
      const mockExistingProfiles = [
        { profileName: 'Existing Profile', _id: { equals: () => true } }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);
      jest.spyOn(CredentialRecord, 'getAllCredentialRecords').mockResolvedValue([]);
      jest.spyOn(CredentialRecord, 'addCredentialRecord').mockResolvedValue({} as any);
      
      const mockWalletData = JSON.stringify({
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/wallet/v1'],
        type: 'UniversalWallet2020',
        contents: [
          {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: 'did:example:123'
          },
          {
            type: 'Ed25519VerificationKey2020',
            id: 'key1'
          },
          {
            type: 'X25519KeyAgreementKey2020',
            id: 'key2' 
          },
          {
            type: 'ProfileMetadata',
            data: { profileName: 'existing profile' }
          }
        ]
      });
      
      // The import should mark profile as duplicate even with different case
      const result = await ProfileRecord.importProfileRecord(mockWalletData);
      
      expect(result.userIdImported).toBe(false);
      expect(result.profileDuplicate).toBe(true);
    });

    it('should create new profile when profile name is unique', async () => {
      const mockExistingProfiles = [
        { profileName: 'Different Profile', _id: 'differentId' }
      ];
      
      jest.spyOn(ProfileRecord, 'getAllProfileRecords').mockResolvedValue(mockExistingProfiles as any);
      jest.spyOn(CredentialRecord, 'getAllCredentialRecords').mockResolvedValue([]);
      jest.spyOn(CredentialRecord, 'addCredentialRecord').mockResolvedValue({} as any);
      
      // Mock DidRecord.addDidRecord
      const { DidRecord } = require('../app/model/did');
      DidRecord.addDidRecord.mockResolvedValue({ _id: '507f1f77bcf86cd799439012' }); // Valid 24-char hex ObjectId
      
      // Mock ProfileRecord.addProfileRecord to avoid circular call
      const originalAddProfile = ProfileRecord.addProfileRecord;
      jest.spyOn(ProfileRecord, 'addProfileRecord').mockImplementation(async ({ profileName }) => {
        // Don't call the real method to avoid infinite recursion
        return { _id: 'newProfileId', profileName } as any;
      });
      
      const mockWalletData = JSON.stringify({
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/wallet/v1'],
        type: 'UniversalWallet2020',
        contents: [
          {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: 'did:example:123'
          },
          {
            type: 'Ed25519VerificationKey2020',
            id: 'key1'
          },
          {
            type: 'X25519KeyAgreementKey2020',
            id: 'key2'
          },
          {
            type: 'ProfileMetadata',
            data: { profileName: 'New Unique Profile' }
          }
        ]
      });
      
      const result = await ProfileRecord.importProfileRecord(mockWalletData);
      
      expect(result.userIdImported).toBe(true);
      expect(result.profileDuplicate).toBe(false);
      
      // Restore original method
      ProfileRecord.addProfileRecord = originalAddProfile;
    });
  });
});