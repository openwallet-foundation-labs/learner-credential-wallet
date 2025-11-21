import { CredentialRecordRaw, VcQueryType } from '../types/credential';
import { filterCredentialRecordsByType } from './credentialMatching';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import {
  delegateZcaps,
  isDidAuthRequested,
  IVpOffer,
  IVprDetails,
  IVpRequest,
  IVprQuery,
  IZcap,
  zcapsRequested
} from './walletRequestApi';
import { extractCredentialsFrom } from './verifiableObject';
import { selectCredentials } from './selectCredentials';
import { ISelectedProfile } from './did';
import { composeVp } from './composeVp';

type IResponseToExchanger = {
  verifiablePresentation?: IVerifiablePresentation;
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
    modalsEnabled = true, modalConfirmZcapRequest, profileRecordId }:
  { exchangeUrl?: string, requestOrOffer: IVpRequest | IVpOffer,
    selectedProfile: ISelectedProfile, modalsEnabled?: boolean,
    modalConfirmZcapRequest: () => Promise<boolean>, profileRecordId?: string }
): Promise<{ acceptCredentials?: IVerifiableCredential[], redirectUrl?: string }> {
  const { redirectUrl, credentialRequestOrigin } = requestOrOffer;

  if ('verifiablePresentation' in requestOrOffer) {
    // This is an offer, return extracted credentials for user approval
    const offer = requestOrOffer.verifiablePresentation as IVerifiablePresentation;
    console.log('Extracting VCs from VP offer.');
    return { acceptCredentials: extractCredentialsFrom(offer)!, redirectUrl }
  }

  if ('verifiablePresentationRequest' in requestOrOffer) {
    console.log('Processing request...')
    const request = requestOrOffer.verifiablePresentationRequest as IVprDetails;
    await processRequest({ request, exchangeUrl, selectedProfile,
      modalsEnabled, modalConfirmZcapRequest, credentialRequestOrigin, profileRecordId });
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
    modalConfirmZcapRequest, credentialRequestOrigin, profileRecordId }:
  { request: IVprDetails, exchangeUrl?: string, selectedProfile: ISelectedProfile,
    modalsEnabled?: boolean, credentialRequestOrigin?: string,
    modalConfirmZcapRequest: () => Promise<boolean>, profileRecordId?: string }
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

  console.log('VC MATCHES:', vcMatches)

  const didAuthRequested = isDidAuthRequested({ queries });
  // challenge and domain are only relevant for DID Auth
  const { challenge, domain } = request;

  console.log('isDidAuthRequested', didAuthRequested, challenge, domain)

  let { zcapRequests } = zcapsRequested({ queries });

  console.log('zcapRequests:', zcapRequests)

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

  console.log('About to select...')

  // If there are any VC matches, prompt the user to confirm
  let selectedVcs: IVerifiableCredential[] = [];
  if (vcMatches.length > 0 && modalsEnabled) {
    // Prompt user to confirm / select which VCs to send
    selectedVcs = (await selectCredentials(vcMatches, profileRecordId))
      .map((r) => r.credential);
  } else if (vcMatches.length > 0) {
    // Not prompting the user
    selectedVcs = vcMatches.map((r) => r.credential);
  }

  console.log('SELECTED VCS:', selectedVcs)

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
 * Sends the Wallet Response object (which may contain a VP or zcaps) to the
 * exchanger.
 *
 * @param exchangeUrl
 * @param payload {{ verifiablePresentation, zcap }}
 */
export async function sendToExchanger({ exchangeUrl, payload }:
  { exchangeUrl: string,
    payload: {
      verifiablePresentation?: IVerifiablePresentation, zcap?: IZcap[]
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
