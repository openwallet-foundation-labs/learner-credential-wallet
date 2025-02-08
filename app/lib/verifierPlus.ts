import { VERIFIER_PLUS_URL } from '../../app.config';
import { CredentialRecordRaw } from '../model';
import { makeSelectDidForCredential, selectWithFactory } from '../store/selectorFactories';
import { createVerifiablePresentation } from './present';

export type StoreCredentialResult = {
  // server at which the vc was stored
  server?: string;
  url: {  // URLs are relative to the server
    // human-readable HTML view of the credential
    view: string;
    // raw JSON GET
    get: string;
    // delete/unshare
    unshare: string;
  };
}

/**
 * Posts a credential to Verifier Plus
 *
 * @param rawCredentialRecord - the credential record to post
 * @returns {StoreCredentialResult} - Server and API URLs for the stored VC.
 */
export async function postCredential(rawCredentialRecord: CredentialRecordRaw): Promise<StoreCredentialResult> {
  const rawDidRecord = selectWithFactory(makeSelectDidForCredential, { rawCredentialRecord });
  const { credential } = rawCredentialRecord;
  const vp = await createVerifiablePresentation({
    didRecord: rawDidRecord, verifiableCredential: credential});

  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vp }),
  };

  const url = `${VERIFIER_PLUS_URL}/api/credentials`;

  const response = await fetch(url, request);
  if (!response.ok) {
    console.log('Verifier Plus URL:', url);
    console.log('Verifier Plus response:', await response.text());
    throw new Error('Failed to post credential to Verifier Plus');
  }

  const result = await response.json() as StoreCredentialResult;
  result.server = VERIFIER_PLUS_URL;

  return result;
}

/**
 * Sends a 'Delete/Unshare Credential' request to VerifierPlus.
 *
 * @param rawCredentialRecord {CredentialRecordRaw} - Credential to unshare.
 * @param unshareUrl {string} - API url for unsharing the credential.
 */
export async function deleteCredential(
  rawCredentialRecord: CredentialRecordRaw, unshareUrl: string
): Promise<void> {
  const rawDidRecord = selectWithFactory(makeSelectDidForCredential, { rawCredentialRecord });
  const { credential } = rawCredentialRecord;
  const vp = await createVerifiablePresentation({
    didRecord: rawDidRecord, verifiableCredential: credential});

  const request = {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vp }),
  };

  console.log('Unshare URL:', unshareUrl);

  const response = await fetch(unshareUrl, request);
  if (!response.ok) {
    console.log('Verifier Plus response:', JSON.stringify(response, null, 2));
    throw new Error(`Failed to delete credential from Verifier Plus: ${response.status} ${response.statusText} ${await response.text()}`);
  }
}
