import { Credential } from '../types/credential';

/**
 * Extracts the credential name from a verifiable credential
 * @param credential The verifiable credential object
 * @returns The credential name or 'Unknown Credential' if not found
 */
export function getCredentialName(credential: Credential): string {
  let achievement = credential.credentialSubject.hasCredential ?? credential.credentialSubject.achievement;
  
  if (Array.isArray(achievement)) {
    achievement = achievement[0];
  }
  
  return achievement?.name ?? 'Unknown Credential';
}