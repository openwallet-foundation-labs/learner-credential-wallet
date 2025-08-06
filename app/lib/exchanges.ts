import uuid from 'react-native-uuid';
import * as vc from '@digitalcredentials/vc';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { securityLoader } from '@digitalcredentials/security-document-loader';
import { ObjectId } from 'bson';
import { getHook } from 'react-hooks-outside';
import validator from 'validator';
import { CredentialRecord } from '../model';
import { navigationRef } from '../navigation';
import store from '../store';
import { clearSelectedExchangeCredentials, selectExchangeCredentials } from '../store/slices/credentialFoyer';
import { Credential, CredentialRecordRaw, VcQueryType } from '../types/credential';
import { VerifiablePresentation } from '../types/presentation';
import { clearGlobalModal, displayGlobalModal } from './globalModal';
import { getGlobalModalBody } from './globalModalBody';
import { delay } from './time';
import { filterCredentialRecordsByType } from './credentialMatching';
import handleZcapRequest from './handleZcapRequest';

const MAX_INTERACTIONS = 10;

// Interact with VC-API exchange
async function postToExchange (url: string, request: any): Promise<any> {
  const exchangeResponseRaw = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  return exchangeResponseRaw.json();
}

// Select credentials to exchange with issuer or verifier
const selectCredentials = async (credentialRecords: CredentialRecordRaw[]): Promise<CredentialRecordRaw[]> => {
  // ensure that the selected credentials have been cleared
  // before subscribing to redux store updates below
  store.dispatch(clearSelectedExchangeCredentials());
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const selectedExchangeCredentials: CredentialRecordRaw[] = getHook('selectedExchangeCredentials');
    if (selectedExchangeCredentials.length === 0) {
      break;
    } else {
      await delay(500);
    }
  }

  let resolvePromise: (value: CredentialRecordRaw[]) => void;
  const selectionPromise = new Promise((resolve: (value: CredentialRecordRaw[]) => void) => {
    resolvePromise = resolve;
  });

  const unsubscribe = store.subscribe(async () => {
    // increase likelihood that the selected credentials
    // have been recorded before processing them
    await delay(1000);
    const selectedExchangeCredentials: CredentialRecordRaw[] = getHook('selectedExchangeCredentials');
    if (selectedExchangeCredentials.length > 0) {
      resolvePromise(selectedExchangeCredentials);
      unsubscribe();
      store.dispatch(clearSelectedExchangeCredentials());
    }
  });

  clearGlobalModal();
  const credentialRecordIds = credentialRecords.map((r: CredentialRecordRaw) => r._id);
  const credentialFilter = (r: CredentialRecordRaw) => {
    return credentialRecordIds.some((id: ObjectId) => r._id.equals(id));
  };
  navigationRef.navigate('CredentialSelectionScreen', {
    title: 'Share Credentials',
    instructionText: 'Select credentials to share.',
    credentialFilter,
    onSelectCredentials: (s: CredentialRecordRaw[]) => {
      const dataLoadingPendingModalState = {
        title: 'Sending Credential',
        confirmButton: false,
        cancelButton: false,
        body: getGlobalModalBody('This will only take a moment.', true)
      };
      displayGlobalModal(dataLoadingPendingModalState);
      store.dispatch(selectExchangeCredentials(s));
    }
  });

  return selectionPromise;
};

// Type definition for constructExchangeRequest function parameters
type ConstructExchangeRequestParameters = {
  credentials?: Credential[];
  challenge?: string | undefined;
  domain: string | undefined;
  holder: string;
  suite: Ed25519Signature2020;
  signed?: boolean;
};

// Type definitions for constructExchangeRequest function output
type ExchangeRequest = {
  verifiablePresentation: VerifiablePresentation
}
type ExchangeResponse = ExchangeRequest;

// Type definition for constructExchangeRequest function parameters
type CreatePresentationParameters = {
  verifiableCredential?: any[];
  id?: string | undefined;
  now?: string | undefined;
  holder: string;
};

// Construct exchange request in the form of a verifiable presentation
export const constructExchangeRequest = async ({
  credentials=[],
  challenge=uuid.v4() as string,
  domain,
  holder,
  suite,
  signed=true
}: ConstructExchangeRequestParameters): Promise<ExchangeRequest> => {
  const presentationOptions: CreatePresentationParameters = { holder };
  if (credentials.length !== 0) {
    presentationOptions.verifiableCredential = credentials;
  }
  const presentation = vc.createPresentation(presentationOptions);
  let finalPresentation = presentation;
  if (signed) {
    const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();
    finalPresentation = await vc.signPresentation({
      presentation,
      challenge,
      domain,
      suite,
      documentLoader
    });
  }
  return { verifiablePresentation: finalPresentation };
};

// Type definition for handleVcApiExchangeSimple function parameters
type HandleVcApiExchangeSimpleParameters = {
  url: string;
  request: ExchangeRequest;
};

// Handle simplified VC-API credential exchange workflow
export const handleVcApiExchangeSimple = async ({ url, request }: HandleVcApiExchangeSimpleParameters): Promise<ExchangeResponse> => {
  const exchangeResponseRaw = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request, undefined, 2)
  });

  return exchangeResponseRaw.json();
};

// Type definition for handleVcApiExchangeComplete function parameters
type HandleVcApiExchangeCompleteParameters = {
  url: string;
  request?: any;
  holder: string;
  suite: Ed25519Signature2020;
  interactions?: number;
  interactive?: boolean;
};

// Handle complete VC-API credential exchange workflow
export async function handleVcApiExchangeComplete ({
  url,
  request = {},
  holder,
  suite,
  interactions = 0,
  interactive = true
}: HandleVcApiExchangeCompleteParameters): Promise<ExchangeResponse> {
  if (interactions === MAX_INTERACTIONS) {
    throw new Error(`Request timed out after ${interactions} interactions`);
  }
  if (!validator.isURL(url + '')) {
    throw new Error(`Received invalid interaction URL from issuer: ${url}`);
  }

  // Start the exchange process - POST an empty {} to the exchange API url
  const exchangeResponse = await postToExchange(url, request);
  console.log('Initial exchange response:', JSON.stringify(exchangeResponse, null, 2));

  if (!exchangeResponse.verifiablePresentationRequest) {
    console.log('No VPR requested from the exchange, returning.');
    return exchangeResponse;
  }

  let signed = false;
  let credentials: Credential[] = [];
  let filteredCredentialRecords: CredentialRecordRaw[] = [];
  const { query, challenge, domain, interact } = exchangeResponse.verifiablePresentationRequest;

  let queries = query;
  if (!Array.isArray(queries)) {
    queries = [query];
  }
  for (const query of queries) {
    console.log(`Processing query type "${query.type}"`);
    switch (query.type) {
    case VcQueryType.DidAuthLegacy:
    case VcQueryType.DidAuth:
      signed = true;
      break;
    // TODO: Support multi-round interactions for zcaps (currently only supports a single round interaction)
    case VcQueryType.ZcapQuery: {
      const vp = await handleZcapRequest({
        request: exchangeResponse.verifiablePresentationRequest
      });
      const interactUrl = exchangeResponse.verifiablePresentationRequest?.interact?.serviceEndpoint;
      if (!interactUrl) {
        throw new Error('Missing serviceEndpoint in VPR interact.');
      }

      const finalResponse = await postToExchange(interactUrl, vp);
      return finalResponse;
    }
    default: {
      console.log('Querying...');
      const allRecords = await CredentialRecord.getAllCredentialRecords();
      const filteredCredentialRecordsGroup: CredentialRecordRaw[] =
        filterCredentialRecordsByType(allRecords, query);
      filteredCredentialRecords = filteredCredentialRecords.concat(filteredCredentialRecordsGroup);
      const filteredCredentials = filteredCredentialRecords.map((r) => r.credential);
      credentials = credentials.concat(filteredCredentials);
    }
    }
  }

  if (interactive && credentials.length > 0) {
    const credentialRecords = await selectCredentials(filteredCredentialRecords);
    credentials = credentialRecords.map((r) => r.credential);
  }

  const exchangeRequest = await constructExchangeRequest({ credentials, challenge, domain, holder, suite, signed });
  const exchangeUrl = interact?.service[0]?.serviceEndpoint ?? url;
  console.log(`Sending request to "${exchangeUrl}":`, exchangeRequest);
  return handleVcApiExchangeComplete({
    url: exchangeUrl, request: exchangeRequest, holder, suite,
    interactions: interactions + 1, interactive
  });
}
