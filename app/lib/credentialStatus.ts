
import { Credential } from '../types/credential';

export enum StatusPurpose {
  Revocation = 'revocation',
  Suspension = 'suspension'
}

export function getCredentialStatusChecker(credential: Credential) {
 
    return null;


}

export function hasStatusPurpose(
  credential: Credential,
  statusPurpose: StatusPurpose
) {
  if (!credential.credentialStatus) {
    return false;
  }
  const credentialStatuses = Array.isArray(credential.credentialStatus) ?
    credential.credentialStatus :
    [credential.credentialStatus];
  return credentialStatuses.some(s => s.statusPurpose === statusPurpose);
}
