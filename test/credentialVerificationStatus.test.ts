import { getVerificationStatus, canShareCredential } from '../app/lib/credentialVerificationStatus';
import { VerifyPayload } from '../app/lib/verifiableObject';

describe('credentialVerificationStatus', () => {
  describe('getVerificationStatus', () => {
    it('should return "verified" when all checks pass', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: true,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(getVerificationStatus(payload)).toBe('verified');
    });

    it('should return "warning" when credential is expired', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: false }, // Expired
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(getVerificationStatus(payload)).toBe('warning');
    });

    it('should return "warning" when issuer is not registered', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: false }, // Not registered
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(getVerificationStatus(payload)).toBe('warning');
    });

    it('should return "not_verified" when signature is invalid', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: false }, // Invalid signature
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(getVerificationStatus(payload)).toBe('not_verified');
    });

    it('should return "not_verified" when credential is revoked', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: false }, // Revoked
          ],
        },
      };

      expect(getVerificationStatus(payload)).toBe('not_verified');
    });

    it('should return "not_verified" when payload is null', () => {
      expect(getVerificationStatus(null)).toBe('not_verified');
    });

    it('should return "not_verified" when log is empty and not verified', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: null,
          timestamp: Date.now(),
          log: [],
        },
      };

      expect(getVerificationStatus(payload)).toBe('not_verified');
    });

    it('should return "verifying" when loading with logs', () => {
      const payload: VerifyPayload = {
        loading: true,
        error: null,
        result: {
          verified: null,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
          ],
        },
      };

      expect(getVerificationStatus(payload)).toBe('verifying');
    });
  });

  describe('canShareCredential', () => {
    it('should allow sharing verified credentials', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: true,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(canShareCredential(payload)).toBe(true);
    });

    it('should allow sharing credentials with warnings (expired)', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: false }, // Expired - Warning status
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(canShareCredential(payload)).toBe(true);
    });

    it('should allow sharing credentials with warnings (unregistered issuer)', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: false }, // Unregistered - Warning status
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(canShareCredential(payload)).toBe(true);
    });

    it('should block sharing not verified credentials (invalid signature)', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: false }, // Invalid signature
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: true },
          ],
        },
      };

      expect(canShareCredential(payload)).toBe(false);
    });

    it('should block sharing not verified credentials (revoked)', () => {
      const payload: VerifyPayload = {
        loading: false,
        error: null,
        result: {
          verified: false,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
            { id: 'expiration', valid: true },
            { id: 'registered_issuer', valid: true },
            { id: 'revocation_status', valid: false }, // Revoked
          ],
        },
      };

      expect(canShareCredential(payload)).toBe(false);
    });

    it('should block sharing when verifying', () => {
      const payload: VerifyPayload = {
        loading: true,
        error: null,
        result: {
          verified: null,
          timestamp: Date.now(),
          log: [
            { id: 'valid_signature', valid: true },
          ],
        },
      };

      expect(canShareCredential(payload)).toBe(false);
    });

    it('should block sharing when payload is null', () => {
      expect(canShareCredential(null)).toBe(false);
    });
  });
});

