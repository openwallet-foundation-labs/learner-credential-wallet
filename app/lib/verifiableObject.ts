import { LruCache } from '@digitalcredentials/lru-memoize';
import { ChapiCredentialResponse, ChapiDidAuthRequest } from '../types/chapi';
// import { ResultLog, verifyCredential, verifyPresentation } from './validate';
import { RegistryClient } from '@digitalcredentials/issuer-registry-client';
import { CredentialRecordRaw } from '../model';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';

/**
 * This type is used to identify a request response that could be a
 * Verifiable Credential or Verifiable Presentation.
 */
export type VerifiableObject = IVerifiableCredential | IVerifiablePresentation;

export function isVerifiableCredential(obj: VerifiableObject): obj is IVerifiableCredential {
  return obj.type?.includes('VerifiableCredential');
}

export function isVerifiablePresentation(obj: VerifiableObject): obj is IVerifiablePresentation {
  return obj.type?.includes('VerifiablePresentation');
}

export function isChapiCredentialResponse(obj: ChapiCredentialResponse): obj is ChapiCredentialResponse {
  return obj.credential?.type === 'web';
}

export function isChapiDidAuthRequest(obj: ChapiDidAuthRequest): obj is ChapiDidAuthRequest {
  return obj.credentialRequestOptions?.web?.VerifiablePresentation?.query?.type === 'DIDAuthentication';
}

export async function verifyVerifiableObject(
  obj: VerifiableObject
): Promise<boolean> {
  try {
    if (isVerifiableCredential(obj)) {
      return (await verifyCredential(obj)).verified;
    }
    if (isVerifiablePresentation(obj)) {
      return (await verifyPresentation(obj)).verified;
    }
  } catch (err) {
    console.warn('Error while verifying:', err);
  }

  return false;
}

export function extractCredentialsFrom(obj: IVerifiableCredential | IVerifiablePresentation):
  IVerifiableCredential[] | null {
  if (isVerifiableCredential(obj)) {
    return [obj];
  }
  if (isVerifiablePresentation(obj) && 'verifiableCredential' in obj) {
    const verifiableCredential = obj.verifiableCredential!;

    if (Array.isArray(verifiableCredential)) {
      return verifiableCredential;
    }
    return [verifiableCredential];
  }

  return null;
}

/* Verification expiration = 30 days */
const VERIFICATION_EXPIRATION = 1000 * 30;
const lruCache = new LruCache({ maxAge: VERIFICATION_EXPIRATION });
export type VerificationResult = {
  timestamp: number | null;
  log: ResultLog[];
  verified: boolean | null;
  error?: Error;
}

export type VerifyPayload = {
  loading: boolean;
  error: string | null;
  result: VerificationResult;
}

export async function verificationResultFor(
  { rawCredentialRecord, forceFresh = false}:
  { rawCredentialRecord: CredentialRecordRaw, forceFresh?: boolean, registries: RegistryClient },
): Promise<VerificationResult> {
  const cachedRecordId = String(rawCredentialRecord._id);

  if (!forceFresh) {
    const cachedResult = await lruCache.memoize({
      key: cachedRecordId,
      fn: () => {
        return verifyCredential(rawCredentialRecord.credential);
      },
    }) as VerificationResult;
    return cachedResult;
  }

  let response, error;
  try {
    response = await verifyCredential(rawCredentialRecord.credential);
  } catch (err) {
    error = err as Error;
  }

  const result: VerificationResult = {
    verified: response?.verified ?? false,
    log: response?.results ? response.results[0].log : [],
    timestamp: Date.now(),
    error,
  };

  return result;
}
