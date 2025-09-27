import { IVerifiableCredential } from '@digitalcredentials/ssi';

export function getIssuanceDate(credential: IVerifiableCredential): string | undefined {
  return credential.validFrom ?? credential.issuanceDate;
}

export function getExpirationDate(credential: IVerifiableCredential): string | undefined {
  return credential.validUntil ?? credential.expirationDate;
}
