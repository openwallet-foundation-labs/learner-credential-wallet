// Mock the json-canonicalize module
jest.mock('json-canonicalize', () => ({
  canonicalize: jest.fn((obj) => obj)
}))

// Mock the crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'a'.repeat(64)) // 64 character hex string
  }))
}))

import {
  canonicalCredentialJson,
  credentialContentHash
} from '../app/lib/credentialHash'
import { mockCredential } from '../app/mock/credential'

describe('credentialHash', () => {
  describe('canonicalCredentialJson', () => {
    it('should return a canonical JSON string', () => {
      const result = canonicalCredentialJson(mockCredential)
      expect(typeof result).toBe('string')
      expect(result).toContain('@context')
    })

    it('should produce consistent output for the same credential', () => {
      const result1 = canonicalCredentialJson(mockCredential)
      const result2 = canonicalCredentialJson(mockCredential)
      expect(result1).toBe(result2)
    })

    it('should produce different output for different credentials', () => {
      const credential2 = { ...mockCredential, id: 'different-id' }
      const result1 = canonicalCredentialJson(mockCredential)
      const result2 = canonicalCredentialJson(credential2)
      expect(result1).not.toBe(result2)
    })
  })

  describe('credentialContentHash', () => {
    it('should return a SHA256 hash string', () => {
      const result = credentialContentHash(mockCredential)
      expect(typeof result).toBe('string')
      expect(result).toHaveLength(64) // SHA256 hex string length
      expect(result).toMatch(/^[a]+$/) // Only 'a' characters from our mock
    })

    it('should produce consistent hash for the same credential', () => {
      const hash1 = credentialContentHash(mockCredential)
      const hash2 = credentialContentHash(mockCredential)
      expect(hash1).toBe(hash2)
    })

    it('should produce consistent hashes for the same credential', () => {
      const hash1 = credentialContentHash(mockCredential)
      const hash2 = credentialContentHash(mockCredential)
      expect(hash1).toBe(hash2)
    })

    it('should call the hash function correctly', () => {
      const { createHash } = require('crypto')
      credentialContentHash(mockCredential)
      expect(createHash).toHaveBeenCalledWith('sha256')
    })
  })
})
