import type { IOpenBadgeSubject, ICredentialSubject } from '@digitalcredentials/ssi';

export function extractNameFromOBV3Identifier (credentialSubject: IOpenBadgeSubject | ICredentialSubject): string | undefined {
  if(!credentialSubject?.identifier) {
    return undefined;
  }

  let identifiers;
  if(!Array.isArray(credentialSubject.identifier)) {
    identifiers = [credentialSubject.identifier];
  } else {
    identifiers = credentialSubject.identifier;
  }

  const identifierWithHash = identifiers.find(
    i => i.identityHash && (i?.hashed === false || i?.hashed === undefined)
  )

  return identifierWithHash?.identityHash || undefined;
}
