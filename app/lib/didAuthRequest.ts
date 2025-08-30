import { ProfileRecordRaw } from '../model';
import { makeSelectDidFromProfile, selectWithFactory } from '../store/selectorFactories';
import { constructExchangeRequest, handleVcApiExchangeSimple } from './exchanges';
import store from '../store';
import { stageCredentials } from '../store/slices/credentialFoyer';
import { Credential } from '../types/credential';
import { extractCredentialsFrom } from './verifiableObject';

import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';

type VerifiablePresentationRequestService = { type: string; serviceEndpoint: string; };

export type DidAuthRequestParams = {
  query: { type: 'DIDAuthentication' };
  interact?: { service: VerifiablePresentationRequestService[] };
  challenge: string;
  domain: string;
};

export async function performDidAuthRequest(params: DidAuthRequestParams, rawProfileRecord: ProfileRecordRaw): Promise<Credential[]> {
  const didRecord = selectWithFactory(makeSelectDidFromProfile, { rawProfileRecord });
  const { challenge, domain, interact } = params;

  const holder = didRecord?.didDocument?.authentication?.[0]?.split('#')?.[0] as string;
  const key = await Ed25519VerificationKey2020.from(didRecord?.verificationKey);
  key.controller ||= didRecord?.didDocument?.id;
  const verificationMethod =
    key.id ?? `${didRecord?.didDocument?.id}#${didRecord?.verificationKey?.id ?? 'keys-1'}`;

  const suite = new Ed25519Signature2020({ key, verificationMethod });

  const url = interact?.service?.[0]?.serviceEndpoint as string;
  const request = await constructExchangeRequest({ challenge, domain, holder, suite });

  const { verifiablePresentation } = await handleVcApiExchangeSimple({ url, request });
  const credentials = extractCredentialsFrom(verifiablePresentation);

  if (credentials) {
    await store.dispatch(stageCredentials(credentials));
    return credentials;
  }
  return [];
}
