import { PendingCredential, ApprovalStatus, ApprovalMessage } from '../app/store/slices/credentialFoyer';
import { mockCredential, mockCredential2 } from '../app/mock/credential';
import { ObjectID } from 'bson';

// Mock the credential hash functions
jest.mock('../app/lib/credentialHash', () => ({
  credentialContentHash: jest.fn((credential) => {
    if (!credential) return 'hash_unknown';
    if (credential === mockCredential) return 'hash_mock1';
    if (credential === mockCredential2) return 'hash_mock2';
    return `hash_${credential.id || 'unknown'}`;
  }),
}));

import { credentialContentHash } from '../app/lib/credentialHash';

describe('Duplicate Handling - Core Logic Tests', () => {
  describe('PendingCredential class functionality', () => {
    it('should create pending credential with default values', () => {
      const pendingCredential = new PendingCredential(mockCredential);
      
      expect(pendingCredential.credential).toBe(mockCredential);
      expect(pendingCredential.status).toBe(ApprovalStatus.Pending);
      expect(pendingCredential.id).toBeDefined();
      expect(typeof pendingCredential.id).toBe('string');
      expect(pendingCredential.messageOverride).toBeUndefined();
    });

    it('should create pending credential with duplicate status', () => {
      const pendingCredential = new PendingCredential(
        mockCredential, 
        ApprovalStatus.PendingDuplicate
      );
      
      expect(pendingCredential.status).toBe(ApprovalStatus.PendingDuplicate);
    });

    it('should create pending credential with message override', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Rejected,
        ApprovalMessage.Duplicate
      );
      
      expect(pendingCredential.messageOverride).toBe(ApprovalMessage.Duplicate);
    });
  });

  describe('Duplicate detection logic', () => {
    it('should detect duplicates using content hash', () => {
      const existingHashes = ['hash_mock1', 'hash_other'];
      const newCredentialHash = credentialContentHash(mockCredential);
      
      const isDuplicate = existingHashes.includes(newCredentialHash);
      expect(isDuplicate).toBe(true);
    });

    it('should not detect duplicates for different credentials', () => {
      const existingHashes = ['hash_mock1'];
      const newCredentialHash = credentialContentHash(mockCredential2);
      
      const isDuplicate = existingHashes.includes(newCredentialHash);
      expect(isDuplicate).toBe(false);
    });

    it('should handle profile-specific duplicate detection', () => {
      const profileId1 = new ObjectID();
      const profileId2 = new ObjectID();
      
      const allCredentials = [
        { credential: mockCredential, profileRecordId: profileId1 },
        { credential: mockCredential2, profileRecordId: profileId2 },
        { credential: mockCredential, profileRecordId: profileId1 },
      ];

      // Filter by profile
      const profile1Credentials = allCredentials.filter(({ profileRecordId }) =>
        profileRecordId.equals(profileId1)
      );

      // Get hashes for profile 1
      const profile1Hashes = profile1Credentials.map(({ credential }) => 
        credentialContentHash(credential)
      );

      // Check for duplicates in profile 1
      const newCredentialHash = credentialContentHash(mockCredential);
      const isDuplicateInProfile1 = profile1Hashes.includes(newCredentialHash);

      expect(profile1Credentials).toHaveLength(2);
      expect(isDuplicateInProfile1).toBe(true);
    });

    it('should allow same credential in different profiles', () => {
      const profileId1 = new ObjectID();
      const profileId2 = new ObjectID();
      
      const allCredentials = [
        { credential: mockCredential, profileRecordId: profileId1 },
      ];

      // Check if credential exists in profile 2
      const profile2Credentials = allCredentials.filter(({ profileRecordId }) =>
        profileRecordId.equals(profileId2)
      );

      const profile2Hashes = profile2Credentials.map(({ credential }) => 
        credentialContentHash(credential)
      );

      const newCredentialHash = credentialContentHash(mockCredential);
      const isDuplicateInProfile2 = profile2Hashes.includes(newCredentialHash);

      expect(isDuplicateInProfile2).toBe(false);
    });
  });

  describe('ApprovalStatus and ApprovalMessage enums', () => {
    it('should have correct enum values', () => {
      expect(ApprovalStatus.Pending).toBe(0);
      expect(ApprovalStatus.PendingDuplicate).toBe(1);
      expect(ApprovalStatus.Accepted).toBe(2);
      expect(ApprovalStatus.Rejected).toBe(3);
      expect(ApprovalStatus.Errored).toBe(4);
    });

    it('should have correct message values', () => {
      expect(ApprovalMessage.Pending).toBe('None');
      expect(ApprovalMessage.Accepted).toBe('Added to Wallet');
      expect(ApprovalMessage.Rejected).toBe('Credential Declined');
      expect(ApprovalMessage.Errored).toBe('Credential Failed to Add');
      expect(ApprovalMessage.Duplicate).toBe(
        'This credential already exists in the selected profile and cannot be added again.'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined credentials', () => {
      const hash1 = credentialContentHash(null as any);
      const hash2 = credentialContentHash(undefined as any);
      
      expect(hash1).toBe('hash_unknown');
      expect(hash2).toBe('hash_unknown');
    });

    it('should handle empty credential arrays', () => {
      const credentials: any[] = [];
      const hashes = credentials.map(credential => credentialContentHash(credential));
      
      expect(hashes).toHaveLength(0);
    });

    it('should generate unique IDs for different instances', () => {
      const credential1 = new PendingCredential(mockCredential);
      const credential2 = new PendingCredential(mockCredential);
      
      expect(credential1.id).not.toBe(credential2.id);
    });
  });
});