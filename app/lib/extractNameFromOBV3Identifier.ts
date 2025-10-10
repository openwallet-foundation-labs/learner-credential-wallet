import type { Subject } from '../types/credential';

export function extractNameFromOBV3Identifier (credentialSubject: Subject): string | undefined {
  if(!credentialSubject?.identifier) {
    return undefined;
  }

  let identifiers;
  if(!Array.isArray(credentialSubject.identifier)) {
    identifiers = [credentialSubject.identifier];
  } else {
    identifiers = credentialSubject.identifier;
  }

  const identifierWithHash = identifiers.find(i => i.identityHash);
    
  return identifierWithHash?.identityHash || undefined;
}