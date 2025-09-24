import { fromQrCode } from '@digitalcredentials/vpqr';
import qs from 'query-string';

import { securityLoader } from '@digitalcredentials/security-document-loader';
import { ChapiCredentialResponse, ChapiDidAuthRequest } from '../types/chapi';
import type { EducationalOperationalCredential, Subject } from '../types/credential';
import { VerifiablePresentation } from '../types/presentation';
import { CredentialRequestParams, isCredentialRequestParams } from './credentialRequest';
import { HumanReadableError } from './error';
import { isChapiCredentialResponse, isChapiDidAuthRequest, isVerifiableCredential, isVerifiablePresentation } from './verifiableObject';
import { CredentialRecordRaw } from '../model';
import { NavigationUtil } from './navigationUtil';
import { DidAuthRequestParams, performDidAuthRequest } from './didAuthRequest';

import { ICredentialSubject, IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import { getSubject } from './credentialDisplay/shared';
import { isDeepLink } from './walletRequestApi';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();
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

function credentialsFromPresentation(vp: IVerifiablePresentation): IVerifiableCredential[] {
  const { verifiableCredential } = vp;
  return ([] as IVerifiableCredential[]).concat(verifiableCredential!);
}

function credentialsFromChapiCredentialResponse(chapiCredentialResponse: ChapiCredentialResponse): IVerifiableCredential[] {
  const { credential } = chapiCredentialResponse;
  const dataType = credential?.dataType;
  switch (dataType) {
  case 'VerifiableCredential':
    return [credential?.data as IVerifiableCredential];
  case 'VerifiablePresentation':
    return credentialsFromPresentation(credential?.data as VerifiablePresentation);
  default:
    return [];
  }
}

async function credentialsFromChapiDidAuthRequest(chapiDidAuthRequest: ChapiDidAuthRequest): Promise<IVerifiableCredential[]> {
  const didAuthRequest = chapiDidAuthRequest.credentialRequestOptions?.web?.VerifiablePresentation as DidAuthRequestParams;
  const rawProfileRecord = await NavigationUtil.selectProfile();
  return performDidAuthRequest(didAuthRequest, rawProfileRecord);
}

async function credentialsFromVpqr(text: string): Promise<IVerifiableCredential[]> {
  const { vp }: { vp: VerifiablePresentation } = await fromQrCode({ text, documentLoader });
  return credentialsFromPresentation(vp);
}

async function credentialsFromJson(text: string): Promise<IVerifiableCredential[]> {
  const data = JSON.parse(text);

  if (isVerifiablePresentation(data)) {
    return credentialsFromPresentation(data);
  }

  if (isVerifiableCredential(data)) {
    return [data];
  }

  if (isChapiCredentialResponse(data)) {
    return credentialsFromChapiCredentialResponse(data);
  }

  if (isChapiDidAuthRequest(data)) {
    return credentialsFromChapiDidAuthRequest(data);
  }

  throw new Error('Credential(s) could not be decoded from the JSON.');
}

/**
 * A method for decoding credentials from a variety text formats.
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

export function educationalOperationalCredentialFrom(credentialSubject: ICredentialSubject): EducationalOperationalCredential | undefined {
  let data = credentialSubject.hasCredential || credentialSubject.achievement;
  if (Array.isArray(data)) {
    data = data[0];
  }

  return data;
}

export function credentialIdFor(rawCredentialRecord: CredentialRecordRaw): string {
  const { credential } = rawCredentialRecord;
  const subject = getSubject(credential);
  const eoc = educationalOperationalCredentialFrom(subject!);
  const achievement = subject?.achievement;
  const id = (Array.isArray(achievement) ? achievement[0]?.id : achievement?.id) || credential.id || subject?.id || eoc?.id;

  if (!id) {
    throw new Error('Credential ID could not be resolved.');
  }

  return id;
}
