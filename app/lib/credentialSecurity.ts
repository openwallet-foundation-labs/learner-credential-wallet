import type { RegistryClient } from '@digitalcredentials/issuer-registry-client';
import { issuerInRegistries } from './issuerInRegistries';
import { Credential } from '../types/credential';

/**
 * Determines if URLs should be disabled for a credential
 */
export function shouldDisableUrls(
  credential: Credential,
  registries: RegistryClient
): boolean {
  try {
    const registryNames = issuerInRegistries({ issuer: credential.issuer, registries });
    const shouldDisable = !registryNames || registryNames.length === 0;
    
    return shouldDisable;
  } catch (error) {
    console.error('Error in shouldDisableUrls:', error);
    return true; // Default to safe mode
  }
}