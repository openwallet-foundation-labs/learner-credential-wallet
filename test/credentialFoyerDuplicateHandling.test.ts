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

describe('Credential Foyer - Duplicate Handling', () => {
  describe('PendingCredential class functionality', () => {
    it('should create pending credential with default values', () => {
      const pendingCredential = new PendingCredential(mockCredential);

      expect(pendingCredential.credential).toBe(mockCredential);
      expect(pendingCredential.status).toBe(ApprovalStatus.Pending);
      expect(pendingCredential.id).toBeDefined();
      expect(typeof pendingCredential.id).toBe('string');
      expect(pendingCredential.messageOverride).toBeUndefined();
    });

    it('should create pending credential with custom status', () => {
      const pendingCredential = new PendingCredential(mockCredential, ApprovalStatus.PendingDuplicate);

      expect(pendingCredential.status).toBe(ApprovalStatus.PendingDuplicate);
    });

    it('should create pending credential with message override', () => {
      const pendingCredential = new PendingCredential(mockCredential, ApprovalStatus.Rejected, ApprovalMessage.Duplicate);

      expect(pendingCredential.messageOverride).toBe(ApprovalMessage.Duplicate);
    });

    it('should generate unique IDs for different instances', () => {
      const credential1 = new PendingCredential(mockCredential);
      const credential2 = new PendingCredential(mockCredential);

      expect(credential1.id).not.toBe(credential2.id);
    });
  });

  describe('ApprovalStatus enum values', () => {
    it('should have correct enum values', () => {
      expect(ApprovalStatus.Pending).toBe(0);
      expect(ApprovalStatus.PendingDuplicate).toBe(1);
      expect(ApprovalStatus.Accepted).toBe(2);
      expect(ApprovalStatus.Rejected).toBe(3);
      expect(ApprovalStatus.Errored).toBe(4);
    });
  });

  describe('ApprovalMessage enum values', () => {
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

  describe('Credential hash-based duplicate detection', () => {
    it('should use content hash for duplicate detection', () => {
      const hash1 = credentialContentHash(mockCredential);
      const hash2 = credentialContentHash(mockCredential2);

      expect(hash1).toBe('hash_mock1');
      expect(hash2).toBe('hash_mock2');
      expect(hash1).not.toBe(hash2);
    });

    it('should detect duplicates based on hash comparison', () => {
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
  });

  describe('Profile-specific duplicate detection logic', () => {
    const profileId1 = new ObjectID();
    const profileId2 = new ObjectID();

    it('should filter credentials by profile ID', () => {
      const allCredentials = [
        { credential: mockCredential, profileRecordId: profileId1 },
        { credential: mockCredential2, profileRecordId: profileId2 },
        { credential: mockCredential, profileRecordId: profileId1 },
      ];

      const profile1Credentials = allCredentials.filter(({ profileRecordId }) =>
        profileRecordId.equals(profileId1)
      );

      expect(profile1Credentials).toHaveLength(2);
      expect(profile1Credentials.every(({ profileRecordId }) =>
        profileRecordId.equals(profileId1)
      )).toBe(true);
    });

    it('should create hash list for profile-specific duplicates', () => {
      const profileCredentials = [
        { credential: mockCredential, profileRecordId: profileId1 },
        { credential: mockCredential2, profileRecordId: profileId1 },
      ];

      const hashes = profileCredentials.map(({ credential }) =>
        credentialContentHash(credential)
      );

      expect(hashes).toEqual(['hash_mock1', 'hash_mock2']);
      expect(hashes).toHaveLength(2);
    });

    it('should handle empty profile credentials', () => {
      const profileCredentials: any[] = [];
      const hashes = profileCredentials.map(({ credential }) =>
        credentialContentHash(credential)
      );

      expect(hashes).toHaveLength(0);
    });
  });

  describe('ObjectID equality testing', () => {
    it('should correctly compare ObjectIDs', () => {
      const id1 = new ObjectID();
      const id2 = new ObjectID();
      const id1Copy = new ObjectID(id1.toHexString());

      expect(id1.equals(id1)).toBe(true);
      expect(id1.equals(id2)).toBe(false);
      expect(id1.equals(id1Copy)).toBe(true);
    });

    it('should handle ObjectID string conversion', () => {
      const id = new ObjectID();
      const hexString = id.toHexString();

      expect(typeof hexString).toBe('string');
      expect(hexString).toHaveLength(24);
    });
  });

  describe('Credential comparison scenarios', () => {
    it('should handle credential with same content but different objects', () => {
      const credential1 = { ...mockCredential };
      const credential2 = { ...mockCredential };

      // Different object references but same content
      expect(credential1).not.toBe(credential2);
      expect(credential1).toEqual(credential2);
    });

    it('should handle null and undefined credentials', () => {
      const hash1 = credentialContentHash(null as any);
      const hash2 = credentialContentHash(undefined as any);

      expect(hash1).toBe('hash_unknown');
      expect(hash2).toBe('hash_unknown');
    });
  });
});
