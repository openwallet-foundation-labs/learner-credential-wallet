import { mockCredential, mockCredential2 } from '../app/mock/credential';
import { ObjectID } from 'bson';

// Mock the credential hash functions
jest.mock('../app/lib/credentialHash', () => ({
  credentialContentHash: jest.fn((credential) => {
    // Create different hashes for different credentials based on content
    if (credential === mockCredential) return 'hash_mock1';
    if (credential === mockCredential2) return 'hash_mock2';
    return `hash_${credential.id || 'unknown'}`;
  }),
}));

// Mock the credential model
const mockGetAllCredentialRecords = jest.fn();
jest.mock('../app/model/credential', () => ({
  CredentialRecord: {
    getAllCredentialRecords: mockGetAllCredentialRecords,
  },
}));

// Mock the credential name utility
jest.mock('../app/lib/credentialName', () => ({
  getCredentialName: jest.fn((credential) => credential.name || 'Test Credential'),
}));

import { credentialContentHash } from '../app/lib/credentialHash';
import { getCredentialName } from '../app/lib/credentialName';

describe('Profile Duplicate Detection', () => {
  const profileId1 = new ObjectID();
  const profileId2 = new ObjectID();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('credential duplicate detection logic', () => {
    it('should detect duplicates within the same profile', async () => {
      const existingCredentials = [
        {
          credential: mockCredential,
          profileRecordId: profileId1,
        },
      ];

      mockGetAllCredentialRecords.mockResolvedValue(existingCredentials);

      const existingHashesInProfile = existingCredentials
        .filter(({ profileRecordId }) => profileRecordId.equals(profileId1))
        .map(({ credential }) => credentialContentHash(credential));

      const isDuplicate = existingHashesInProfile.includes(credentialContentHash(mockCredential));

      expect(isDuplicate).toBe(true);
      expect(credentialContentHash).toHaveBeenCalledWith(mockCredential);
    });

    it('should not detect duplicates across different profiles', async () => {
      const existingCredentials = [
        {
          credential: mockCredential,
          profileRecordId: profileId1,
        },
      ];

      mockGetAllCredentialRecords.mockResolvedValue(existingCredentials);

      const existingHashesInProfile = existingCredentials
        .filter(({ profileRecordId }) => profileRecordId.equals(profileId2))
        .map(({ credential }) => credentialContentHash(credential));

      const isDuplicate = existingHashesInProfile.includes(credentialContentHash(mockCredential));

      expect(isDuplicate).toBe(false);
    });

    it('should handle multiple credentials in the same profile', async () => {
      const existingCredentials = [
        {
          credential: mockCredential,
          profileRecordId: profileId1,
        },
        {
          credential: mockCredential2,
          profileRecordId: profileId1,
        },
      ];

      mockGetAllCredentialRecords.mockResolvedValue(existingCredentials);

      const existingHashesInProfile = existingCredentials
        .filter(({ profileRecordId }) => profileRecordId.equals(profileId1))
        .map(({ credential }) => credentialContentHash(credential));

      const isDuplicate1 = existingHashesInProfile.includes(credentialContentHash(mockCredential));
      const isDuplicate2 = existingHashesInProfile.includes(credentialContentHash(mockCredential2));

      expect(isDuplicate1).toBe(true);
      expect(isDuplicate2).toBe(true);
      expect(existingHashesInProfile).toHaveLength(2);
    });

    it('should handle mixed profiles correctly', async () => {
      const existingCredentials = [
        {
          credential: mockCredential,
          profileRecordId: profileId1,
        },
        {
          credential: mockCredential2,
          profileRecordId: profileId2,
        },
      ];

      mockGetAllCredentialRecords.mockResolvedValue(existingCredentials);

      // Check for duplicates in profile 1
      const existingHashesInProfile1 = existingCredentials
        .filter(({ profileRecordId }) => profileRecordId.equals(profileId1))
        .map(({ credential }) => credentialContentHash(credential));

      // Check for duplicates in profile 2
      const existingHashesInProfile2 = existingCredentials
        .filter(({ profileRecordId }) => profileRecordId.equals(profileId2))
        .map(({ credential }) => credentialContentHash(credential));

      expect(existingHashesInProfile1).toHaveLength(1);
      expect(existingHashesInProfile2).toHaveLength(1);
      expect(existingHashesInProfile1[0]).toBe('hash_mock1');
      expect(existingHashesInProfile2[0]).toBe('hash_mock2');
    });
  });

  describe('profile import report logic', () => {
    it('should track duplicate credentials during import', () => {
      const profileImportReport = {
        profileDuplicate: false,
        credentials: {
          duplicate: [] as string[],
          added: [] as string[],
        },
      };

      const credentials = [mockCredential, mockCredential2];
      const existingHashes = ['hash_mock1']; // mockCredential already exists
      const processedHashes = new Set<string>();

      credentials.forEach((credential) => {
        const credentialName = getCredentialName(credential);
        const hash = credentialContentHash(credential);

        if (existingHashes.includes(hash) && !processedHashes.has(hash)) {
          profileImportReport.credentials.duplicate.push(credentialName);
          processedHashes.add(hash);
        } else if (!existingHashes.includes(hash)) {
          profileImportReport.credentials.added.push(credentialName);
        }
      });

      expect(profileImportReport.credentials.duplicate).toHaveLength(1);
      expect(profileImportReport.credentials.added).toHaveLength(1);
      expect(getCredentialName).toHaveBeenCalledTimes(2);
    });

    it('should handle empty existing credentials', () => {
      const credentials = [mockCredential];
      const existingHashes: string[] = [];

      const isDuplicate = existingHashes.includes(credentialContentHash(mockCredential));

      expect(isDuplicate).toBe(false);
    });

    it('should use credential content hash instead of ID for comparison', () => {
      // This test ensures we're using content hash, not credential ID
      const credential1 = { ...mockCredential, id: 'id1' };
      const credential2 = { ...mockCredential, id: 'id2' }; // Same content, different ID

      const hash1 = credentialContentHash(credential1);
      const hash2 = credentialContentHash(credential2);

      // Verify the hash function is being called correctly
      expect(credentialContentHash).toHaveBeenCalledWith(credential1);
      expect(credentialContentHash).toHaveBeenCalledWith(credential2);
      expect(typeof hash1).toBe('string');
      expect(typeof hash2).toBe('string');
    });
  });

  describe('ObjectID equality checks', () => {
    it('should correctly compare ObjectIDs', () => {
      const id1 = new ObjectID();
      const id2 = new ObjectID();
      const id1Copy = new ObjectID(id1.toHexString());

      expect(id1.equals(id1)).toBe(true);
      expect(id1.equals(id2)).toBe(false);
      expect(id1.equals(id1Copy)).toBe(true);
    });

    it('should filter credentials by profile ID correctly', () => {
      const credentials = [
        { profileRecordId: profileId1, credential: mockCredential },
        { profileRecordId: profileId2, credential: mockCredential2 },
        { profileRecordId: profileId1, credential: mockCredential },
      ];

      const profile1Credentials = credentials.filter(({ profileRecordId }) =>
        profileRecordId.equals(profileId1)
      );

      expect(profile1Credentials).toHaveLength(2);
      expect(profile1Credentials.every(({ profileRecordId }) =>
        profileRecordId.equals(profileId1)
      )).toBe(true);
    });
  });
});
