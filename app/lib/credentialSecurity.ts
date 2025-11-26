import type { RegistryClient } from '@digitalcredentials/issuer-registry-client';
import { issuerInRegistries } from './issuerInRegistries';
import { IVerifiableCredential } from '@digitalcredentials/ssi';
import type { ResultLog } from './validate';

type VerificationResultLike = {
  log?: ResultLog[];
} | null | undefined;

function issuerRecognizedByVerification(verificationResult?: VerificationResultLike): boolean {
  if (!Array.isArray(verificationResult?.log)) {
    return false;
  }

  return verificationResult.log.some((entry) => {
    if (entry.id !== 'registered_issuer') return false;
    const matchingIssuers = (entry as ResultLog & { matchingIssuers?: unknown[] }).matchingIssuers;
    return entry.valid && Array.isArray(matchingIssuers) ? matchingIssuers.length > 0 : entry.valid;
  });
}

/**
 * Determines if URLs should be disabled for a credential
 */
export function shouldDisableUrls(
  credential: IVerifiableCredential,
  registries: RegistryClient,
  verificationResult?: VerificationResultLike
): boolean {
  try {
    if (issuerRecognizedByVerification(verificationResult)) {
      return false;
    }

    const registryNames = issuerInRegistries({ issuer: credential.issuer, registries });
    const shouldDisable = !registryNames || registryNames.length === 0;

    return shouldDisable;
  } catch (error) {
    console.error('Error in shouldDisableUrls:', error);
    return true; // Default to safe mode
  }
}
