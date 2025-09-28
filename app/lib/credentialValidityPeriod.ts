import { IVerifiableCredential } from '@digitalcredentials/ssi';

export function getIssuanceDate(credential: IVerifiableCredential): string | undefined {
  return credential.validFrom ?? credential.issuanceDate;
}

export function getExpirationDate(credential: IVerifiableCredential): string | undefined {
  return credential.validUntil ?? credential.expirationDate;
}

export function isExpired(credential: IVerifiableCredential): boolean {
  const expiration = getExpirationDate(credential);
  if (!expiration) return false;
  const t = Date.parse(String(expiration));
  return !Number.isNaN(t) && t < Date.now();
}
