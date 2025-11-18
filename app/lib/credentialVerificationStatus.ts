import { VerifyPayload } from './verifiableObject';

export type VerificationStatus = 'verifying' | 'verified' | 'warning' | 'not_verified';

/**
 * Determines the verification status of a credential based on its verification result.
 * 
 * @param verifyPayload - The verification payload from useVerifyCredential
 * @returns The verification status: 'verified', 'warning', 'not_verified', or 'verifying'
 * 
 * Status definitions:
 * - 'verified': All checks passed (valid signature, not revoked, not expired, registered issuer)
 * - 'warning': Non-critical issues (expired or unregistered issuer) but signature is valid
 * - 'not_verified': Critical failures (invalid signature or revocation status failed)
 * - 'verifying': Verification is in progress
 */
export function getVerificationStatus(verifyPayload: VerifyPayload | null): VerificationStatus {
  if (!verifyPayload) {
    return 'not_verified';
  }

  const logs = verifyPayload.result?.log ?? [];
  const isLoading = verifyPayload.loading;
  const isVerified = verifyPayload.result?.verified;

  // If no logs and not verified, treat as not verified
  if (logs.length === 0 && isVerified === null) {
    return 'not_verified';
  }

  // If still loading but has some logs, show as verifying
  if (isLoading && logs.length > 0) {
    return 'verifying';
  }

  // Build details map from logs
  const details = logs.reduce<Record<string, boolean>>((acc, log) => {
    acc[log.id] = log.valid;
    return acc;
  }, {});

  // Add default values for expected checks if missing
  ['valid_signature', 'expiration', 'registered_issuer'].forEach((key) => {
    if (!(key in details)) {
      details[key] = false;
    }
  });

  // Check for critical failures (invalid signature or revocation)
  const hasFailure = ['valid_signature', 'revocation_status'].some(
    (key) => details[key] === false
  );

  // Check for warnings (expiration or unregistered issuer)
  const hasWarning = ['expiration', 'registered_issuer'].some(
    (key) => details[key] === false
  );

  if (hasFailure) return 'not_verified';
  if (hasWarning) return 'warning';

  return 'verified';
}

/**
 * Checks if a credential can be shared based on its verification status.
 * Only 'not_verified' credentials are blocked from sharing.
 * 
 * @param verifyPayload - The verification payload from useVerifyCredential
 * @returns true if the credential can be shared, false otherwise
 */
export function canShareCredential(verifyPayload: VerifyPayload | null): boolean {
  const status = getVerificationStatus(verifyPayload);
  // Allow 'verified' and 'warning' (including expired), but block 'not_verified' and 'verifying'
  return status === 'verified' || status === 'warning';
}

