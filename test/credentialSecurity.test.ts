import { shouldDisableUrls } from '../app/lib/credentialSecurity'
import { RegistryClient } from '@digitalcredentials/issuer-registry-client'

// Mock the issuerInRegistries function
jest.mock('../app/lib/issuerInRegistries', () => ({
  issuerInRegistries: jest.fn()
}))

import { issuerInRegistries } from '../app/lib/issuerInRegistries'

describe('credentialSecurity', () => {
  let mockRegistries: RegistryClient
  let mockCredential: any

  beforeEach(() => {
    mockRegistries = {} as RegistryClient
    mockCredential = {
      issuer: 'did:example:123',
      type: ['VerifiableCredential']
    }
    jest.clearAllMocks()
  })

  describe('shouldDisableUrls', () => {
    it('should return true when credential is not from DCC registry', () => {
      ;(issuerInRegistries as jest.Mock).mockReturnValue(null)

      const result = shouldDisableUrls(mockCredential, mockRegistries)

      expect(result).toBe(true)
    })

    it('should return false when credential is from DCC registry', () => {
      ;(issuerInRegistries as jest.Mock).mockReturnValue(['DCC Registry'])

      const result = shouldDisableUrls(mockCredential, mockRegistries)

      expect(result).toBe(false)
    })

    it('should return true when issuer is in empty registry list', () => {
      (issuerInRegistries as jest.Mock).mockReturnValue([]);
      
      const result = shouldDisableUrls(mockCredential, mockRegistries);
      
      expect(result).toBe(true);
    });

    it('should return false when verification confirms registered issuer', () => {
      (issuerInRegistries as jest.Mock).mockReturnValue(null);

      const verificationResult = {
        log: [
          { id: 'registered_issuer', valid: true, matchingIssuers: [{}] },
        ],
      };

      const result = shouldDisableUrls(mockCredential, mockRegistries, verificationResult as any);

      expect(result).toBe(false);
    });

    it('should ignore verification log entries that are invalid', () => {
      (issuerInRegistries as jest.Mock).mockReturnValue([]);

      const verificationResult = {
        log: [
          { id: 'registered_issuer', valid: false, matchingIssuers: [] },
        ],
      };

      const result = shouldDisableUrls(mockCredential, mockRegistries, verificationResult as any);

      expect(result).toBe(true);
    });
  });
});