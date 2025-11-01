import { createHash } from 'crypto';
import { canonicalize as jcsCanonicalize } from 'json-canonicalize';
import type { Credential } from '../types/credential';

export function canonicalCredentialJson(credential: Credential): string {
  return JSON.stringify(jcsCanonicalize(credential));
}

export function credentialContentHash(credential: Credential): string {
  const json = canonicalCredentialJson(credential);
  return createHash('sha256').update(json).digest('hex');
}


