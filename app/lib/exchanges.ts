import uuid from 'react-native-uuid';
import * as vc from '@digitalcredentials/vc';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { securityLoader } from '@digitalcredentials/security-document-loader';
import { CredentialRecordRaw, VcQueryType } from '../types/credential';
import { VerifiablePresentation } from '../types/presentation';
import { filterCredentialRecordsByType } from './credentialMatching';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import {
  isDidAuthRequested, zcapsRequested,
  IVpOffer,
  IVprDetails,
  IVpRequest, IVprQuery,
  IZcap, delegateZcaps
} from './walletRequestApi';
import { extractCredentialsFrom } from './verifiableObject';
import { selectCredentials } from './selectCredentials';
import { ISelectedProfile } from './did';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();

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

type IResponseToExchanger = {
  verifiablePresentation?: VerifiablePresentation;
  zcap?: IZcap[];
}

/**
 * Recursively processes one or more VC API exchange messages.
 * If necessary, prompt the user to select which VCs to send.
 *
 * @param exchangeUrl {string}
 * @param requestOrOffer - Exchange message to process.
 * @param selectedProfile {ISelectedProfile} - Selected DID profile, containing
 *   key signers used for DIDAuthentication and zCap delegation.
 * @param [modalsEnabled=true] {boolean} - Whether to present the user
 *   with an interactive modal popup to confirm sending credentials.
 *   Disabled for unit testing.
 * @param modalConfirmZcapRequest
 */
export async function processMessageChain (
  { exchangeUrl, requestOrOffer, selectedProfile,
    modalsEnabled = true, modalConfirmZcapRequest }:
  { exchangeUrl?: string, requestOrOffer: IVpRequest | IVpOffer,
    selectedProfile: ISelectedProfile, modalsEnabled?: boolean,
    modalConfirmZcapRequest: () => Promise<boolean> }
): Promise<{ acceptCredentials?: IVerifiableCredential[], redirectUrl?: string }> {
  const { redirectUrl, credentialRequestOrigin } = requestOrOffer;

  if ('verifiablePresentation' in requestOrOffer) {
    // This is an offer, return extracted credentials for user approval
    const offer = requestOrOffer.verifiablePresentation as IVerifiablePresentation;
    console.log('Extracting VCs from VP offer.');
    return { acceptCredentials: extractCredentialsFrom(offer)!, redirectUrl }
  }

  if ('verifiablePresentationRequest' in requestOrOffer) {
    const request = requestOrOffer.verifiablePresentationRequest as IVprDetails;
    await processRequest({ request, exchangeUrl, selectedProfile,
      modalsEnabled, modalConfirmZcapRequest, credentialRequestOrigin });
    return { redirectUrl };
  }

  console.log('[processMessageChain] No offer or request found, exiting...');
  return {};
}

/**
 *
 * @param request
 * @param exchangeUrl {string}
 * @param selectedProfile {ISelectedProfile} - Selected DID profile, containing
 *   key signers used for DIDAuthentication and zCap delegation.
 * @param [modalsEnabled=true] {boolean} - Whether to present the user
 *   with an interactive modal popup to confirm sending credentials.
 *   Disabled for unit testing.
 * @param modalConfirmZcapRequest {function}
 * @param credentialRequestOrigin {string}
 */
export async function processRequest (
  { request, exchangeUrl, selectedProfile, modalsEnabled = true,
    modalConfirmZcapRequest, credentialRequestOrigin }:
  { request: IVprDetails, exchangeUrl?: string, selectedProfile: ISelectedProfile,
    modalsEnabled?: boolean, credentialRequestOrigin?: string,
    modalConfirmZcapRequest: () => Promise<boolean> }
): Promise<void> {
  if (!exchangeUrl) {
    throw new Error('Missing exchangeUrl, cannot send response.');
  }

  // TODO: Display origin in consent modals
  console.log('credentialRequestOrigin: ', credentialRequestOrigin);

  const queries = Array.isArray(request.query) ? request.query : [request.query];
  /**
   * Queries come in 3 types:
   * 1. VC "queries by example" - requester wants one or more VCs.
   * 2. DIDAuth - requester wants a proof of DID Authentication, which is a
   *    signed VerifiablePresentation.
   * 3. zCap queries - requester wants permission/capabilities to do something.
   */
  const vcMatches = await vcMatchesFor({ queries, selectedProfile });

  const didAuthRequested = isDidAuthRequested({ queries });
  // challenge and domain are only relevant for DID Auth
  const { challenge, domain } = request;

  let { zcapRequests } = zcapsRequested({ queries });
  let zcapUserConsent, zcaps;
  if (zcapRequests && modalsEnabled) {
    zcapUserConsent = await modalConfirmZcapRequest();
  } else {
    zcapUserConsent = true;
  }
  if (zcapRequests && zcapUserConsent) {
    zcaps = await delegateZcaps({ zcapRequests, selectedProfile });
  }

  if (vcMatches.length === 0 && !zcaps && !didAuthRequested) {
    // No matches were found, nothing to send to requester
    console.log(
      '[processMessageChain] No zcaps or VCs matched request query, ending exchange.');
    return;
    // TODO: At some point, we should probably inform the user that no matches were found
  }

  // We have zcap or VC matches, compose the response
  const walletResponse: IResponseToExchanger = {};

  // If any zcaps were requested and granted, add them to response
  if (zcaps && zcaps.length > 0) {
    walletResponse.zcap = zcaps;
  }

  // If there are any VC matches, prompt the user to confirm
  let selectedVcs: IVerifiableCredential[] = [];
  if (vcMatches.length > 0 && modalsEnabled) {
    // Prompt user to confirm / select which VCs to send
    selectedVcs = (await selectCredentials(vcMatches))
      .map((r) => r.credential);
  } else if (vcMatches.length > 0) {
    // Not prompting the user
    selectedVcs = vcMatches.map((r) => r.credential);
  }

  // Compose a VerifiablePresentation (to send to the requester) if appropriate
  if (didAuthRequested || selectedVcs.length > 0) {
    walletResponse.verifiablePresentation = await composeVp({
      selectedProfile, selectedVcs, challenge, domain, didAuthRequested
    })
  }

  const responseFromExchanger = await sendToExchanger({ exchangeUrl,
    payload: walletResponse });
  console.log('Response from Exchanger: ', responseFromExchanger);
  // End the exchange
}

/**
 * Processes VC "Query by Example" queries against credentials stored in the
 * selected profile. Returns any matches.
 */
export async function vcMatchesFor ({ queries, selectedProfile }:
  { queries: IVprQuery[], selectedProfile: ISelectedProfile }
): Promise<CredentialRecordRaw[]> {
  const vcQueries = queries.filter(q => q.type === VcQueryType.Example);
  if (vcQueries.length === 0) {
    console.log('No VCs were requested in the query.');
    return [];
  }
  let matches = [] as CredentialRecordRaw[];
  const allCredentialRecords = await selectedProfile.loadCredentials();
  for (const query of vcQueries) {
    matches = matches.concat(
      filterCredentialRecordsByType(allCredentialRecords, query));
  }
  return matches;
}

/**
 * Creates a Verifiable Presentation, to send back to the
 * requester (an Exchanger instance).
 * The VP is signed if DID Auth was requested, and unsigned otherwise.
 */
export async function composeVp (
  { selectedProfile, selectedVcs = [], challenge, domain, didAuthRequested }:
    { selectedProfile: ISelectedProfile, selectedVcs?: IVerifiableCredential[],
      challenge?: string, domain?: string, didAuthRequested: boolean }
): Promise<VerifiablePresentation> {
  if (!didAuthRequested && selectedVcs!.length === 0) {
    throw new Error('A VP requires either credentials or a DID Auth request.');
  }
  if (didAuthRequested && !(challenge && domain)) {
    throw new Error('Both "challenge" and "domain" are required for DID Auth.');
  }

  if (!didAuthRequested) {
    // Return an unsigned VP
    return await vc.createPresentation({ verifiableCredential: selectedVcs, verify: false });
  }

  // Return a signed VP
  const presentation = await vc.createPresentation({
    holder: selectedProfile.did,
    verifiableCredential: (selectedVcs!.length > 0) ? selectedVcs : undefined,
    verify: false
  });
  return await vc.signPresentation({
    presentation, challenge, domain, documentLoader,
    suite: new Ed25519Signature2020({ signer: selectedProfile.signers.authentication })
  })
}

/**
 * Sends the Wallet Response object (which may contain a VP or zcaps) to the
 * exchanger.
 *
 * @param exchangeUrl
 * @param payload {{ verifiablePresentation, zcap }}
 */
export async function sendToExchanger({ exchangeUrl, payload }:
  { exchangeUrl: string,
    payload: {
      verifiablePresentation?: VerifiablePresentation, zcap?: IZcap[]
    } }
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



