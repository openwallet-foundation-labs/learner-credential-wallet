import uuid from 'react-native-uuid';
import * as vc from '@digitalcredentials/vc';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { securityLoader } from '@digitalcredentials/security-document-loader';
import { DidRecordRaw } from '../model';
import { CredentialRecordRaw, VcQueryType } from '../types/credential';
import { VerifiablePresentation } from '../types/presentation';
import { filterCredentialRecordsByType } from './credentialMatching';
import { HumanReadableError } from './error';
import { ISigner, IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import {
  delegateZcap,
  isDidAuthRequested, isZcapRequested,
  IVpOffer,
  IVprDetails,
  IVpRequest,
  IZcap
} from './walletRequestApi';
import { extractCredentialsFrom } from './verifiableObject';
import { selectCredentials } from './selectCredentials';

const MAX_INTERACTIONS = 10;

// Type definition for constructExchangeRequest function parameters
type ConstructExchangeRequestParameters = {
  credentials?: IVerifiableCredential[];
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
type HandleVcApiExchangeParameters = {
  url: string;
  request?: any;
  holder: string;
  suite: Ed25519Signature2020;
  interactions?: number;
  interactive?: boolean;
};

type IResponseToExchanger = {
  verifiablePresentation?: VerifiablePresentation;
  zcap?: IZcap | IZcap[];
}

/**
 * Recursively processes one or more VC API exchange messages.
 * If necessary, prompt the user to select which VCs to send.
 *
 * @param exchangeUrl {string}
 * @param requestOrOffer - Exchange message to process.
 * @param selectedDidRecord - DID document for the selected profile.
 *   In case DIDAuthentication is required.
 * @param rootZcapSigner - In case zCaps are requested.
 * @param loadCredentials {Function} - Loads all VC records from local database.
 *   Passed in (instead of called locally) for unit testing convenience.
 * @param [interactions=0] {number} - Prevents infinite request loops.
 * @param [confirmModalEnabled=true] {boolean} - Whether to present the user
 *   with an interactive modal popup to confirm sending credentials.
 *   Disabled for unit testing.
 */
export async function processMessageChain (
  { exchangeUrl, requestOrOffer, selectedDidRecord, rootZcapSigner, loadCredentials,
    interactions = 0, confirmModalEnabled = true, confirmZcapModal }:
  { exchangeUrl?: string, requestOrOffer: IVpRequest | IVpOffer,
    selectedDidRecord?: DidRecordRaw, rootZcapSigner?: ISigner,
    loadCredentials: () => Promise<CredentialRecordRaw[]>,
    interactions?: number, confirmModalEnabled?: boolean,
    confirmZcapModal: () => Promise<boolean> }
): Promise<{ acceptCredentials?: IVerifiableCredential[], redirectUrl?: string }> {
  const { redirectUrl } = requestOrOffer;

  console.log('selectedDidRecord', JSON.stringify(selectedDidRecord));

  // Classify the message
  let request, offer;
  if ('verifiablePresentation' in requestOrOffer) {
    offer = requestOrOffer.verifiablePresentation as IVerifiablePresentation;
  } else {
    request = requestOrOffer.verifiablePresentationRequest as IVprDetails;
  }

  // Check to see if this is an offer, if it is, return and finish
  if (offer) {
    console.log('Extracting VCs from VP offer.');
    return { acceptCredentials: extractCredentialsFrom(offer)!, redirectUrl }
  }
  if (interactions === MAX_INTERACTIONS) {
    throw new Error(`Request timed out after ${interactions} interactions`);
  }

  if (!request) {
    console.log('[processMessageChain] No offer or request found, exiting...');
    return {};
  }

  const queries = Array.isArray(request.query) ? request.query : [request.query];
  let { didAuthRequest } = isDidAuthRequested({ queries });

  // if (didAuthRequest && confirmModalEnabled) {
  // }

  let { zcapRequests } = isZcapRequested({ queries });
  if (zcapRequests && confirmModalEnabled) {
    await confirmZcapModal();
  }

  // Process the queries (assemble and confirm credentials, delegate zcaps)
  const { credentials, zcaps, challenge, domain, didAuthRequested } =
    await processRequestQueries({ request, rootZcapSigner, loadCredentials });

  if (credentials.length === 0 && zcaps.length === 0) {
    // No matches were found, nothing to send to requester
    console.log(
      '[processMessageChain] No zcaps or VCs matched request query, ending exchange.');
    return { redirectUrl }
    // TODO: At some point, we should probably inform the user that no matches were found
  }

  // We have zcap or VC matches, compose the response
  const walletResponse: IResponseToExchanger = {};
  // If any zcaps were requested (and matched the query), add them to response
  if (zcaps.length > 0) {
    walletResponse.zcap = zcaps;
  }

  let selectedVcs;
  if (credentials.length > 0 && confirmModalEnabled) {
    // Prompt user to confirm / select which VCs to send
    selectedVcs = (await selectCredentials(credentials))
      .map((r) => r.credential);
  } else {
    // Not prompting the user
    selectedVcs = credentials.map((r) => r.credential);
  }

  // Compose a VerifiablePresentation (to send to the requester) if appropriate
  if (selectedVcs.length > 0) {
    walletResponse.verifiablePresentation = await composeVp({
      selectedDidRecord, selectedVcs, challenge, domain, didAuthRequested
    })
  }

  const haveResponse = selectedVcs.length > 0 || zcaps.length > 0
  if (!haveResponse) {
    return {};
  }

  if (!exchangeUrl) {
    throw new Error('Missing exchangeUrl, cannot send response.');
  }

  const responseFromExchanger = await sendToExchanger({ exchangeUrl,
    payload: walletResponse });

  console.log('Response from Exchanger: ', responseFromExchanger);

  // if (responseFromExchanger) {
  //   return processMessageChain ({ requestOrOffer: responseFromExchanger,
  //     selectedDidRecord, rootZcapSigner, interactions: interactions + 1,
  //     loadCredentials });
  // }

  // No further requests from exchanger, end exchange
  return {};
}

export async function sendToExchanger({ exchangeUrl, payload }:
  { exchangeUrl: string, payload: any }
): Promise<any> {
  try {
    const exchangeResponseRaw = await fetch(exchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return exchangeResponseRaw.json();
  } catch (err) {
    console.log(`Error sending to Exchanger endpoint "${exchangeUrl}".`);
    throw err;
  }
}

export async function composeVp (
  { selectedDidRecord, selectedVcs, challenge, domain, didAuthRequested }:
  { selectedDidRecord?: DidRecordRaw, selectedVcs: IVerifiableCredential[],
    challenge?: string, domain?: string, didAuthRequested: boolean }
): Promise<VerifiablePresentation> {
  const presentation = vc.createPresentation({
    verifiableCredential: selectedVcs
  });
  if (selectedDidRecord && didAuthRequested) {
    return signVp({ presentation, selectedDidRecord, challenge, domain });
  }
  // Return unsigned VP
  return presentation;
}

export async function signVp({ presentation, selectedDidRecord, challenge, domain }:
  { presentation: IVerifiablePresentation, selectedDidRecord: DidRecordRaw,
    challenge?: string, domain?: string }
): Promise<any> {

}

export type TQueryResult = {
  credentials: CredentialRecordRaw[]
  zcaps: IZcap[],
  challenge?: string,
  domain?: string,
  didAuthRequested: boolean
}

export async function processRequestQueries(
  { request, rootZcapSigner, loadCredentials }:
  { request: IVprDetails, rootZcapSigner?: ISigner,
    loadCredentials: () => Promise<CredentialRecordRaw[]> }
): Promise<TQueryResult> {
  let vcs: CredentialRecordRaw[] = [];
  let zcaps: IZcap[] = [];

  const queries = Array.isArray(request.query) ? request.query : [request.query];

  let challenge, domain;
  let didAuthRequested = false;
  // If there's more than one DIDAuth request, fail
  const didAuthRequests = queries.filter(q => q.type === 'DIDAuthentication');
  if (didAuthRequests.length > 1) {
    throw new HumanReadableError('More than one DIDAuthentication request found, exiting.');
  } else if (didAuthRequests.length === 1) {
    ({ challenge, domain } = request);
    didAuthRequested = true;
  }

  for (const query of queries) {
    console.log(`Processing query type "${query.type}"`);
    switch (query.type) {
    case VcQueryType.Example:
      // eslint-disable-next-line no-case-declarations
      const allRecords = await loadCredentials();
      vcs = vcs.concat(filterCredentialRecordsByType(allRecords, query));
      break;
    case VcQueryType.ZcapQuery:
      if (!rootZcapSigner) {
        throw new HumanReadableError(
          'Cannot process zcap request, root signer not initialized.');
      }
      zcaps.push(await delegateZcap({ query, rootZcapSigner }));
      break;
    default:
      throw new HumanReadableError(`Unsupported query type: "${query.type}"`)
    }
  }
  return { credentials: vcs, zcaps, challenge, domain, didAuthRequested };
}

