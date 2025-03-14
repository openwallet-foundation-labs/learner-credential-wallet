import uuid from 'react-native-uuid';
// import '@digitalcredentials/data-integrity-rn';
import * as vc from '@digitalcredentials/vc';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { securityLoader } from '@digitalcredentials/security-document-loader';
import { ObjectId } from 'bson';
import { getHook } from 'react-hooks-outside';
import validator from 'validator';
import { CredentialRecord } from '../model/credential';
import { navigationRef } from '../navigation';
import store from '../store';
import { clearSelectedExchangeCredentials, selectExchangeCredentials } from '../store/slices/credentialFoyer';
import { Credential, CredentialRecordRaw } from '../types/credential';
import { VerifiablePresentation } from '../types/presentation';
import { clearGlobalModal, displayGlobalModal } from './globalModal';
import { getGlobalModalBody } from './globalModalBody';
import { delay } from './time';
import { credentialMatchesVprExampleQuery } from './credentialMatching';

const MAX_INTERACTIONS = 10;

// Different types of queries in verifiable presentation request
enum QueryType {
  Example = 'QueryByExample',
  Frame = 'QueryByFrame',
  DidAuth = 'DIDAuthentication',
  DidAuthLegacy = 'DIDAuth'
}

// Interact with VC-API exchange
const interactExchange = async (url: string, request={}): Promise<any> => {
  const exchangeResponseRaw = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: '{}' // Empty JSON object, per VC-API/CHAPI spec.
  });
  return exchangeResponseRaw.json();
};

// Query credential records by type
const queryCredentialRecordsByType = async (query: any): Promise<CredentialRecordRaw[]> => {
  const credentialRecords = await CredentialRecord.getAllCredentialRecords();
  console.log('Starting with all VC records:', JSON.stringify(credentialRecords, null, 2));
  let matchedCredentialRecords: CredentialRecordRaw[];
  switch (query.type) {
  case QueryType.Example: {
    const example = query.credentialQuery?.example;
    if (!example) {
      // This is an error with the exchanger, as the request is malformed
      console.log('"example" field missing in QueryByExample.');
      return [];
    }
    const credentialRecordMatches = await Promise.all(credentialRecords.map((c: CredentialRecordRaw) => credentialMatchesVprExampleQuery(example, c)));
    matchedCredentialRecords = credentialRecords.filter((c: CredentialRecordRaw, i: number) => credentialRecordMatches[i]);
    console.log('Resulting matches:', matchedCredentialRecords);
    break;
  }
  case QueryType.Frame:
  case QueryType.DidAuth:
  case QueryType.DidAuthLegacy:
    matchedCredentialRecords = [];
    break;
  default:
    matchedCredentialRecords = [];
    break;
  }
  return matchedCredentialRecords;
};

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

// Determine if any additional VC-API exchange interactions are required
const requiresAction = (exchangeResponse: any): boolean => {
  return !!exchangeResponse.verifiablePresentationRequest;
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
export const handleVcApiExchangeComplete = async ({
  url,
  request={},
  holder,
  suite,
  interactions=0,
  interactive=false
}: HandleVcApiExchangeCompleteParameters): Promise<ExchangeResponse> => {
  if (interactions === MAX_INTERACTIONS) {
    throw new Error(`Request timed out after ${interactions} interactions`);
  }
  if (!validator.isURL(url + '')) {
    throw new Error(`Received invalid interaction URL from issuer: ${url}`);
  }

  const exchangeResponse = await interactExchange(url, request);
  console.log('Initial exchange response:', JSON.stringify(exchangeResponse, null, 2));
  if (!requiresAction(exchangeResponse)) {
    console.log('Does not require action, returning.');
    return exchangeResponse;
  }

  let signed = false;
  let credentials: Credential[] = [];
  let filteredCredentialRecords: CredentialRecordRaw[] = [];
  const { query, challenge, domain, interact } = exchangeResponse.verifiablePresentationRequest;
  console.log('Extracted:', JSON.stringify(query, null, 2), challenge, domain, interact);
  let queries = query;
  if (!Array.isArray(queries)) {
    queries = [query];
  }
  for (const query of queries) {
    console.log(`Processing query type "${query.type}"`);
    switch (query.type) {
    case QueryType.DidAuthLegacy:
    case QueryType.DidAuth:
      signed = true;
      break;
    default: {
      console.log('Querying...');
      const filteredCredentialRecordsGroup: CredentialRecordRaw[] = await queryCredentialRecordsByType(query);
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
  return handleVcApiExchangeComplete({ url: exchangeUrl, request: exchangeRequest, holder, suite, interactions: interactions + 1, interactive });
};
