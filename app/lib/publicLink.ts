import 'react-native-get-random-values';
import { CredentialRecordRaw } from '../model';
import { IssuerObject } from '../types/credential';
import { Cache, CacheKey } from './cache';
import { getExpirationDate, getIssuanceDate } from './credentialValidityPeriod';
import { credentialIdFor, educationalOperationalCredentialFrom } from './decode';
import * as verifierPlus from './verifierPlus';
import { StoreCredentialResult } from './verifierPlus';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';
import { WalletStorage } from '@did-coop/wallet-attached-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS_STORAGE_KEYS, WAS_BASE_URL } from '../screens/WAS/WasScreen';
import { v4 as uuidv4 } from 'uuid';

export async function createPublicLinkFor(
  rawCredentialRecord: CredentialRecordRaw
): Promise<string> {
  const id = credentialIdFor(rawCredentialRecord);

  // First, try to use WAS if it's available
  const wasLink = await tryCreateWasLinkFor(rawCredentialRecord);

  if (wasLink) {
    // Store link in cache for future use
    await Cache.getInstance().store(CacheKey.PublicLinks, id, {
      server: WAS_BASE_URL,
      url: { view: wasLink.replace(WAS_BASE_URL, '') },
    });
    return wasLink;
  }
  const links = await verifierPlus.postCredential(rawCredentialRecord);

  // store links in cache for future use (for copying and pasting it to share, for un-sharing)
  await Cache.getInstance().store(CacheKey.PublicLinks, id, links);
  return `${links.server}${links.url.view}`;
}

export async function unshareCredential(rawCredentialRecord: CredentialRecordRaw): Promise<void> {
  const vcId = credentialIdFor(rawCredentialRecord);

  const publicLinks = await Cache.getInstance()
    .load(CacheKey.PublicLinks, vcId) as StoreCredentialResult;
  const unshareUrl = `${publicLinks.server}${publicLinks.url.unshare}`;

  await Cache.getInstance().remove(CacheKey.PublicLinks, vcId);

  await verifierPlus.deleteCredential(rawCredentialRecord, unshareUrl);
}

export async function getPublicViewLink(rawCredentialRecord: CredentialRecordRaw): Promise<string | null> {
  const id = credentialIdFor(rawCredentialRecord);

  try {
    const publicLinks = await Cache.getInstance()
      .load(CacheKey.PublicLinks, id) as StoreCredentialResult;
    return `${publicLinks.server}${publicLinks.url.view}`;
  } catch (err) {
    if ((err as Error).name === 'NotFoundError') return null;
    throw err;
  }
}

export async function hasPublicLink(rawCredentialRecord: CredentialRecordRaw): Promise<boolean> {
  const url = await getPublicViewLink(rawCredentialRecord);
  return url !== null;
}

export async function linkedinUrlFrom(rawCredentialRecord: CredentialRecordRaw): Promise<string> {
  const publicLink = await getPublicViewLink(rawCredentialRecord);
  const eoc = educationalOperationalCredentialFrom(rawCredentialRecord.credential.credentialSubject);

  if (!eoc) {
    throw new Error('No achievement/credential found, not sharing to LI.');
  }

  const issuer = rawCredentialRecord.credential.issuer as IssuerObject;
  const title = eoc?.name ?? 'Verifiable Credential';
  const issuanceDateString = getIssuanceDate(rawCredentialRecord.credential);
  const hasIssuanceDate = issuanceDateString !== undefined;
  const issuanceDate = hasIssuanceDate && new Date(issuanceDateString);
  const expirationDateString = getExpirationDate(rawCredentialRecord.credential);
  const hasExpirationDate = expirationDateString !== undefined;
  const expirationDate = hasExpirationDate && new Date(expirationDateString);
  const organizationInfo = `&name=${title}&organizationName=${issuer.name}`;
  const issuance = issuanceDate ? `&issueYear=${issuanceDate.getFullYear()}` +
    `&issueMonth=${new Date(issuanceDate).getMonth() + 1}` : '';
  const expiration = expirationDate ? `&expirationYear=${expirationDate.getFullYear()}` +
    `&expirationMonth=${new Date(expirationDate).getMonth() + 1}` : '';
  const certUrl = publicLink ? `&certUrl=${publicLink}` : '';

  const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME${organizationInfo}${issuance}${expiration}${certUrl}`;

  return url;
}
async function tryCreateWasLinkFor(
  rawCredentialRecord: CredentialRecordRaw
): Promise<string | null> {
  // Check if WAS space is provisioned
  const signerJsonString = await AsyncStorage.getItem(
    WAS_STORAGE_KEYS.SIGNER_JSON
  );
  console.log('WAS signer JSON:', signerJsonString ? 'Found' : 'Not found');

  if (!signerJsonString) {
    console.log(
      '[publicLink.ts] WAS not provisioned (signerJsonString missing), falling back to verifierPlus'
    );
    return null;
  }
  
  try {
    // Create signer from the stored JSON
    const signer = await Ed25519Signer.fromJSON(signerJsonString);
    console.log('Recreated signer with ID:', signer.id);

    // Get stored space UUID
    const storedSpaceUUID = await AsyncStorage.getItem(WAS_STORAGE_KEYS.SPACE_ID);
    console.log('Stored space UUID:', storedSpaceUUID);

    if (!storedSpaceUUID) {
      console.log('[publicLink.ts] No stored space ID found, falling back to verifierPlus');
      return null;
    }

    // Add urn:uuid: prefix for WalletStorage.provisionSpace
    const spaceId = `urn:uuid:${storedSpaceUUID}`;
    
    // Connect to existing space
    const space = await WalletStorage.provisionSpace({
      url: WAS_BASE_URL,
      signer,
      id: spaceId as `urn:uuid:${string}`,
    });
    console.log('Connected to space:', space.path);
    
    // Per Dmitri's suggestion, use a UUID instead of the credential ID
    // Create a simpler resource name with a UUID
    const resourceUUID = uuidv4();
    console.log('Resource UUID:', resourceUUID);
    
    // Serialize the credential as JSON
    const credentialJson = JSON.stringify(rawCredentialRecord);

    // Create a resource with the UUID
    const resource = space.resource(resourceUUID);
    console.log('Resource path:', resource.path);
    
    // Create the credential blob with correct content type
    const credentialBlob = new Blob([credentialJson], {
      type: 'application/json'
    });
    
    // Store the credential in WAS
    console.log('Storing credential in WAS with signer:', signer.id);
    const response = await resource.put(credentialBlob, { signer });
    console.log('WAS storage response:', {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      console.error(
        '[publicLink.ts] Failed to store credential in WAS. Status:',
        response.status
      );
      return null;
    }
    
    // Create a public link with the standard resource path
    // Since the space is configured with public: true, this should work in browsers
    const publicLink = `${WAS_BASE_URL}${resource.path}`;
    console.log('Created WAS public link:', publicLink);
    
    // Store the link in the cache with the format expected by the app
    const id = credentialIdFor(rawCredentialRecord);
    await Cache.getInstance().store(CacheKey.PublicLinks, id, {
      server: WAS_BASE_URL,
      url: { 
        view: resource.path,
        // Include a path for unsharing
        unshare: resource.path
      }
    });
    
    return publicLink;
  } catch (error) {
    console.error('[publicLink.ts] Error in tryCreateWasLinkFor:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return null;
  }
}
