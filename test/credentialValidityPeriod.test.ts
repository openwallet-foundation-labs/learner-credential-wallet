import { getIssuanceDate, getExpirationDate } from '../app/lib/credentialValidityPeriod';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

describe('credentialValidityPeriod', () => {
  describe('getIssuanceDate', () => {
    it('should return V1 issuanceDate when available', () => {
      const credentialV1 = {
        issuanceDate: '2023-01-01T00:00:00Z'
      } as IVerifiableCredential;

      expect(getIssuanceDate(credentialV1)).toBe('2023-01-01T00:00:00Z');
    });

    it('should return V2 validFrom when available', () => {
      const credentialV2 = {
        validFrom: '2023-02-01T00:00:00Z'
      } as IVerifiableCredential;

      expect(getIssuanceDate(credentialV2)).toBe('2023-02-01T00:00:00Z');
    });

    it('should prefer V2 validFrom over V1 issuanceDate', () => {
      const credential = {
        issuanceDate: '2023-01-01T00:00:00Z',
        validFrom: '2023-02-01T00:00:00Z'
      } as IVerifiableCredential;

      expect(getIssuanceDate(credential)).toBe('2023-02-01T00:00:00Z');
    });

    it('should return undefined when no date available', () => {
      const credential = {} as any;
      expect(getIssuanceDate(credential)).toBeUndefined();
    });
  });

  describe('getExpirationDate', () => {
    it('should return V1 expirationDate when available', () => {
      const credentialV1 = {
        expirationDate: '2024-01-01T00:00:00Z'
      } as IVerifiableCredential;

      expect(getExpirationDate(credentialV1)).toBe('2024-01-01T00:00:00Z');
    });

    it('should return V2 validUntil when available', () => {
      const credentialV2 = {
        validUntil: '2024-02-01T00:00:00Z'
      } as IVerifiableCredential;

      expect(getExpirationDate(credentialV2)).toBe('2024-02-01T00:00:00Z');
    });

    it('should prefer V2 validUntil over V1 expirationDate', () => {
      const credential = {
        expirationDate: '2024-01-01T00:00:00Z',
        validUntil: '2024-02-01T00:00:00Z'
      } as IVerifiableCredential;

      expect(getExpirationDate(credential)).toBe('2024-02-01T00:00:00Z');
    });

    it('should return undefined when no date available', () => {
      const credential = {} as any;
      expect(getExpirationDate(credential)).toBeUndefined();
    });
  });
});
