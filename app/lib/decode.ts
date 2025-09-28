import qs from 'query-string';

import { CredentialRequestParams } from './credentialRequest';

import { CredentialRecordRaw } from '../model';

import { IVerifiableCredential } from '@digitalcredentials/ssi';
import { getSubject } from './credentialDisplay/shared';
import { isDeepLink } from './walletRequestApi';
import { credentialsFromVpqr } from './credentialsFromVpqr';
import { credentialsFromPresentation } from './credentialsFromPresentation';
import { isVerifiableCredential, isVerifiablePresentation } from './validate';

export const regexPattern = {
  vpqr: /^VP1-[A-Z|0-9]+/,
  url: /^https?:\/\/.+/,
  json: /^{.*}$/s,
};

export function isLegacyCredentialRequest (url: string): boolean {
  if (!isDeepLink(url)) {
    return false;
  }
  // TODO: Use native URL object instead of 'qs'
  const queryParams = qs.parse(url.split('?')[1]);
  return ('vc_request_url' in queryParams) &&
    ('issuer' in queryParams)
}

export function legacyRequestParamsFromUrl(url: string): CredentialRequestParams {
  const params = qs.parse(url.split('?')[1]);
  return params as CredentialRequestParams;
}

async function credentialsFromJson(text: string): Promise<IVerifiableCredential[]> {
  const data = JSON.parse(text);

  if (isVerifiablePresentation(data)) {
    return credentialsFromPresentation(data);
  }

  if (isVerifiableCredential(data)) {
    return [data];
  }

  throw new Error('Credential(s) could not be decoded from the JSON.');
}

/**
 * A method for decoding credentials from a variety text formats.
 * Used on the Add Credential screen (when a user scans QR code or pastes
 * something into the text box).
 *
 * @param text - A string containing a VPQR, URL, or JSON object.
 * @returns {Promise<IVerifiableCredential[]>} - An array of credentials.
 */
export async function credentialsFrom(text: string): Promise<IVerifiableCredential[]> {
  if (regexPattern.url.test(text)) {
    const response = await fetch(text);
    text = await response.text().then((t) => t.trim());
  }

  if (regexPattern.vpqr.test(text)) {
    return credentialsFromVpqr(text);
  }

  if (regexPattern.json.test(text)) {
    return credentialsFromJson(text);
  }

  throw new Error('No credentials were resolved from the text');
}

export function credentialIdFor(rawCredentialRecord: CredentialRecordRaw): string {
  const { credential } = rawCredentialRecord;
  const subject = getSubject(credential);
  const achievement = subject.achievement;
  const id = (Array.isArray(achievement) ? achievement[0]?.id : achievement?.id) || credential.id || subject?.id;

  if (!id) {
    throw new Error('Credential ID could not be resolved.');
  }

  return id;
}
