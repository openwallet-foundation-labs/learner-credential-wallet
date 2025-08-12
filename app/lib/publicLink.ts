import 'react-native-get-random-values';
import { CredentialRecordRaw } from '../model';
import { IssuerObject } from '../types/credential';
import { Cache, CacheKey } from './cache';
import { getExpirationDate, getIssuanceDate } from './credentialValidityPeriod';
import { credentialIdFor, educationalOperationalCredentialFrom } from './decode';
import * as verifierPlus from './verifierPlus';
import { StoreCredentialResult } from './verifierPlus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorageClient } from '../screens/WAS/WasScreen';
import { v4 as uuidv4 } from 'uuid';
import { WAS, VERIFIER_PLUS_URL } from '../../app.config';
import { getRootSigner } from './getRootSigner';
import { ISigner } from '@wallet.storage/fetch-client/types';

let cachedSigner: ISigner | null = null;

export async function createPublicLinkFor(
  rawCredentialRecord: CredentialRecordRaw
): Promise<string> {
  const id = credentialIdFor(rawCredentialRecord);

  const wasLink = WAS.enabled ? await createWasPublicLinkIfAvailable(rawCredentialRecord) : null;

  if (WAS.enabled && wasLink) {
    try {
      await Cache.getInstance().store(CacheKey.PublicLinks, id, {
        server: WAS.BASE_URL,
        url: { 
          view: wasLink.replace(WAS.BASE_URL, ''),
          unshare: wasLink.replace(WAS.BASE_URL, '')
        },
      });
      return wasLink;
    } catch (error) {
      console.error('[publicLink.ts] Error checking WAS link:', error);
      // Fall through to verifierPlus
    }
  }
  
  // Fall back to verifierPlus
  console.log('[publicLink.ts] Using verifierPlus to create public link');
  const links = await verifierPlus.postCredential(rawCredentialRecord);

  await Cache.getInstance().store(CacheKey.PublicLinks, id, links);
  return `${links.server}${links.url.view}`;
}

/**
 * Creates a WAS public link for a credential if WAS is available
 * @param rawCredentialRecord - The credential to create a link for
 * @returns The public link URL or null if WAS is not available
 */
async function createWasPublicLinkIfAvailable(
  rawCredentialRecord: CredentialRecordRaw
): Promise<string | null> {
  try {
    const signer = await getRootSigner();
    cachedSigner = signer;

    console.log('Using signer with ID:', signer.id);

    // Get stored space UUID
    const storedSpaceUUID = await AsyncStorage.getItem(WAS.KEYS.SPACE_ID);
    console.log('Stored space UUID:', storedSpaceUUID);

    if (!storedSpaceUUID) {
      console.log('[publicLink.ts] No stored space ID found, falling back to verifierPlus');
      return null;
    }

    const spaceId = `urn:uuid:${storedSpaceUUID}` as `urn:uuid:${string}`;
    
    const storage = getStorageClient();
    
    const space = storage.space({ 
      signer, 
      id: spaceId
    });
    console.log('Using space:', space.path);
    
    const resourceUUID = uuidv4();
    console.log('Resource UUID:', resourceUUID);
    
    // Extract just the credential object
    const credentialJson = JSON.stringify(rawCredentialRecord.credential);

    const resource = space.resource('', {
      uuid: `urn:uuid:${resourceUUID}` as `urn:uuid:${string}`
    });
    console.log('Resource path:', resource.path);
    
    // Create the credential blob with correct content type
    const credentialBlob = new Blob([credentialJson], {
      type: 'application/json'
    });
    console.log('Storing credential in WAS with signer:', signer.id);
    
    // Manually create HTTP signature authorization for the resource PUT request
    const response = await resource.put(credentialBlob, { 
      signer,
    });
    
    console.log('WAS storage response:', {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      console.error(
        '[publicLink.ts] Failed to store credential in WAS. Status:',
        response.status,
      );
      return null;
    }
    
    // Create the public link using the resource path
    const publicLink = `${VERIFIER_PLUS_URL}/#verify?vc=${WAS.BASE_URL}${resource.path}`;
    console.log('Created WAS public link:', publicLink);

    return publicLink; 
  } catch (error) {
    console.error('[publicLink.ts] Error in createWasPublicLinkIfAvailable:', error);
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

export async function unshareCredential(rawCredentialRecord: CredentialRecordRaw): Promise<void> {
  const vcId = credentialIdFor(rawCredentialRecord);

  try {
    const publicLinks = await Cache.getInstance()
      .load(CacheKey.PublicLinks, vcId) as StoreCredentialResult;
      
    if (WAS.enabled && publicLinks.server === WAS.BASE_URL) {
      // This is a WAS link
      console.log('Unsharing WAS credential');
      
      if (!cachedSigner) {
        const signer = await getRootSigner();
        cachedSigner = signer;
      }
      
      if (cachedSigner) {
        const signer = cachedSigner;
        
        const resourcePath = publicLinks.url.unshare;
        const resourceName = resourcePath.split('/').pop();
        
        const storedSpaceUUID = await AsyncStorage.getItem(WAS.KEYS.SPACE_ID);
        if (storedSpaceUUID) {
          const spaceId = `urn:uuid:${storedSpaceUUID}` as `urn:uuid:${string}`;
          const storage = getStorageClient();
          const space = storage.space({ 
            signer, 
            id: spaceId 
          });
          const resource = space.resource(resourceName);
          await resource.delete({ signer });
        }
      }
    } else {
      // This is a verifierPlus link
      const unshareUrl = `${publicLinks.server}${publicLinks.url.unshare}`;
      await verifierPlus.deleteCredential(rawCredentialRecord, unshareUrl);
    }
  } catch (error) {
    console.error('Error unsharing credential:', error);
  }
  await Cache.getInstance().remove(CacheKey.PublicLinks, vcId);
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