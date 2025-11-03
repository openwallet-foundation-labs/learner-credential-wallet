import { Credential, CredentialV1, CredentialV2 } from '../types/credential';

function getIssuanceDateV1(credential: Credential): string | undefined {
  return (credential as CredentialV1).issuanceDate;
}

function getIssuanceDateV2(credential: Credential): string | undefined {
  return (credential as CredentialV2).validFrom;
}

export function getIssuanceDate(credential: Credential): string | undefined {
  const issuanceDateV1 = getIssuanceDateV1(credential);
  const issuanceDateV2 = getIssuanceDateV2(credential);
  return issuanceDateV2 ?? issuanceDateV1;
}

function getExpirationDateV1(credential: Credential): string | undefined {
  return (credential as CredentialV1).expirationDate;
}

function getExpirationDateV2(credential: Credential): string | undefined {
  return (credential as CredentialV2).validUntil;
}

export function getExpirationDate(credential: Credential): string | undefined {
  const expirationDateV1 = getExpirationDateV1(credential);
  const expirationDateV2 = getExpirationDateV2(credential);
  return expirationDateV2 ?? expirationDateV1;
}

export function isExpired(credential: Credential): boolean {
  const expiration = getExpirationDate(credential);
  if (!expiration) return false;
  const t = Date.parse(String(expiration));
  return !Number.isNaN(t) && t < Date.now();
}
