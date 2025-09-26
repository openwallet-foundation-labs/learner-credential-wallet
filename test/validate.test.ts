import { verifyPresentation, verifyCredential } from '../app/lib/validate';
import * as verifierCore from '@digitalcredentials/verifier-core';
import { VerifiablePresentation } from '../app/types/presentation';
import { Credential } from '../app/types/credential';

jest.mock('@digitalcredentials/verifier-core', () => ({
  verifyPresentation: jest.fn(),
  verifyCredential: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ registries: ['test-registry'] })
    });
  });

  describe('verifyPresentation', () => {
    it('should verify presentation successfully', async () => {
      const mockPresentation = { type: 'VerifiablePresentation' } as VerifiablePresentation;
      const mockResult = { verified: true, results: [] };
      
      (verifierCore.verifyPresentation as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyPresentation(mockPresentation);
      
      expect(verifierCore.verifyPresentation).toHaveBeenCalledWith({
        presentation: mockPresentation
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle verification failure', async () => {
      const mockPresentation = { type: 'VerifiablePresentation' } as VerifiablePresentation;
      const mockResult = { verified: false, results: [] };
      
      (verifierCore.verifyPresentation as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyPresentation(mockPresentation);
      expect(result).toEqual(mockResult);
    });

    it('should throw error on verification exception', async () => {
      const mockPresentation = { type: 'VerifiablePresentation' } as VerifiablePresentation;
      
      (verifierCore.verifyPresentation as jest.Mock).mockRejectedValue(new Error('Verification failed'));
      
      await expect(verifyPresentation(mockPresentation)).rejects.toThrow('Presentation encoded could not be checked for verification and may be malformed.');
    });
  });

  describe('verifyCredential', () => {
    it('should verify credential successfully', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      const mockResult = {
        verified: true,
        log: [{ id: 'test', valid: true }],
        results: [{ verified: true, log: [{ id: 'test', valid: true }] }]
      };
      
      (verifierCore.verifyCredential as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyCredential(mockCredential);
      
      expect(result.verified).toBe(true);
    });

    it('should handle credential with error in results', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      const mockResult = {
        verified: true,
        log: [{ id: 'test', valid: true }],
        results: [{ 
          verified: true, 
          error: { log: [{ id: 'error', valid: false }] }
        }]
      };
      
      (verifierCore.verifyCredential as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyCredential(mockCredential);
      
      expect((result as any).results[0].log).toEqual([{ id: 'error', valid: false }]);
    });

    it('should handle missing log in response', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      const mockResult = { verified: true };
      
      (verifierCore.verifyCredential as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyCredential(mockCredential);
      
      expect((result as any).log).toEqual([]);
      expect(result.verified).toBe(false); // Empty log means no valid checks
    });

    it('should create results when missing', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      const mockResult = {
        verified: true,
        log: [{ id: 'test', valid: true }]
      };
      
      (verifierCore.verifyCredential as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyCredential(mockCredential);
      
      expect((result as any).results).toHaveLength(1);
      expect((result as any).results[0].verified).toBe(true);
    });

    it('should handle revocation status not found', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      const mockResult = {
        verified: false,
        log: [
          { id: 'signature', valid: true },
          { id: 'revocation_status', valid: false, error: { name: 'status_list_not_found' } }
        ],
        results: [{ verified: false, log: [] }]
      };
      
      (verifierCore.verifyCredential as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyCredential(mockCredential);
      
      expect(result.verified).toBe(true);
      expect((result as any).log).toHaveLength(1);
    });

    it('should handle revocation status error', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      const mockResult = {
        verified: false,
        log: [
          { id: 'signature', valid: true },
          { id: 'revocation_status', valid: false, error: { name: 'other_error' } }
        ],
        results: [{ verified: false, log: [] }]
      };
      
      (verifierCore.verifyCredential as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await verifyCredential(mockCredential);
      
      expect((result as any).hasStatusError).toBe(true);
      expect((result as any).results[0].log).toContainEqual({
        id: 'revocation_status',
        valid: false
      });
    });

    it('should throw error on verification exception', async () => {
      const mockCredential = { type: 'VerifiableCredential' } as unknown as Credential;
      
      (verifierCore.verifyCredential as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await expect(verifyCredential(mockCredential)).rejects.toThrow('Credential could not be checked for verification and may be malformed.');
    });
  });
});