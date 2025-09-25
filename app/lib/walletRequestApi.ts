/**
 * Wallet/VC API
 *
 * Contains code having to do with external messages to the wallet,
 * either offers of credentials, or requests for credentials.
 *
 * Defines high level VC API message types:
 *
 * - IExchangeInvitation ("A request or an offer is waiting for you over at...")
 * - IVpRequest ("The following things are requested...")
 * - IVpOffer ("I'm offering the following credentials")
 * - IIssueRequest ("Wallet, can you sign this unsigned VC for me")
 *
 * These messages can be passed to the wallet via:
 * - Deep links / universal app links
 * - JSON objects fetched or pasted into the Add screen
 */
import { ISigner, IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import qs from 'query-string';
import { LinkConfig } from '../../app.config';
import { HumanReadableError } from './error';

export function isDeepLink (text: string): boolean {
  return text.startsWith(LinkConfig.schemes.universalAppLink) ||
    !!LinkConfig.schemes.customProtocol.find((link) => text.startsWith(link));
}

export function isWalletApiMessage (text: string): boolean {
  let messageObject
  try {
    messageObject = JSON.parse(text);
  } catch (_) {
    return false;
  }
  return ('protocols' in messageObject) ||
    ('verifiablePresentationRequest' in messageObject) ||
    ('verifiablePresentation' in messageObject) ||
    ('issueRequest' in messageObject)
}

export function parseWalletApiMessage ({ messageObject }: { messageObject: object }): WalletApiMessage | undefined {
  if ('protocols' in messageObject) {
    return messageObject as IExchangeInvitation;
  }
  if ('verifiablePresentationRequest' in messageObject) {
    return messageObject as IVpRequest;
  }
  if ('verifiablePresentation' in messageObject) {
    return messageObject as IVpOffer;
  }
  if ('issueRequest' in messageObject) {
    return messageObject as IIssueRequest;
  }
  // Message not recognized / not supported, return undefined
  console.log('[parseWalletApiUrl] Unrecognized message type');
}

export function parseWalletApiUrl ({ url }: { url: string }): object | undefined {
  const { query } = qs.parseUrl(url);
  const messageText = query.request;

  if (messageText === undefined) {
    console.log('[parseWalletApiUrl] URL does not contain "request" param.');
    return;
  }
  let messageObject;
  try {
    messageObject = JSON.parse(decodeURI(messageText as string));
  } catch (err) {
    console.log(`Error parsing incoming wallet API message: "${messageText}"`,
      err);
    return;
  }
  return messageObject;
}

export function isZcapRequested ({ queries }:
  { queries: IVprQuery[] }
): { zcapRequests?: IVprQuery[] } {
  const zcapRequests = queries.filter(q => q.type === 'ZcapQuery');
  if (zcapRequests.length > 0) {
    return { zcapRequests };
  }
  return {};
}

export function isDidAuthRequested ({ queries }:
  { queries: IVprQuery[] }
): { didAuthRequest?: IVprQuery } {
  const didAuthRequests = queries.filter(q => q.type === 'DIDAuthentication');
  if (didAuthRequests.length > 1) {
    // If there's more than one DIDAuth request, fail
    throw new HumanReadableError(
      'More than one DIDAuthentication request found, exiting.');
  }
  if (didAuthRequests.length === 1) {
    return { didAuthRequest: didAuthRequests[0] };
  }
  return {};
}

/**
 * {
 *   capabilityQuery: {
 *     reason: '...',
 *     allowedAction: ['GET', 'PUT', ...],
 *     controller: 'did:key:...',
 *     invocationTarget: {
 *       type: 'urn:was:collection', contentType: 'application/vc',
 *       name: 'VerifiableCredential collection'
 *     }
 *   }
 * }
 * @param query
 * @param rootZcapSigner
 */
export async function delegateZcap({ query, rootZcapSigner }:
  {query: IZcapQuery, rootZcapSigner: ISigner}
): Promise<IZcap> {

}

export type WalletApiMessage = IExchangeInvitation
  | IVpRequest
  | IVpOffer
  | IIssueRequest

/**
 * @see https://vcplayground.org/docs/n/chapi/wallets/native/#verifiable-credential-storage
 */
export type IExchangeInvitation = {
  credentialRequestOrigin?: string;
  /**
   * "vcapi": "https://exchanger.example.com/...",
   * "OID4VCI": "openid-credential-offer://?...",
   * etc
   */
  protocols: Record<string, string>
}

/**
 * {
 *   "type": "UnmediatedHttpPresentationService2021",
 *   "serviceEndpoint": "https://example.com/exchanges/tx/12345"
 * }
 */
export type IInteractMethod = {
  type: string;
  serviceEndpoint?: string;
}

export type IIssueRequest = {
  credentialRequestOrigin?: string;
  issueRequest: {
    interact: IInteractMethod | IInteractMethod[];
    credential: IVerifiableCredential | IVerifiableCredential[];
  }
}

/**
 * @see https://vcplayground.org/docs/n/chapi/wallets/native/#vc-api
 */
export type IVpOffer = {
  credentialRequestOrigin?: string;
  verifiablePresentation: IVerifiablePresentation;
  redirectUrl?: string;
}

/**
 * @see https://vcplayground.org/docs/n/chapi/wallets/native/#oid4vci
 */
export type IOid4VCIOffer = {
  credential_issuer: string;
  credentials: any[];
  grants: any;
}

/**
 * @see https://w3c-ccg.github.io/vp-request-spec/
 */
export type IVpRequest = {
  credentialRequestOrigin?: string;
  verifiablePresentationRequest: IVprDetails;
  redirectUrl?: string;
}

export type IVprDetails = {
  // 'interact' object soon to be deprecated in VPR spec
  interact?: IInteractMethod | IInteractMethod[];
  query: IVprQuery | IVprQuery[];
  challenge?: string;
  domain?: string;
}

export type IVprQuery = IQueryByExample
  | IDidAuthenticationQuery
  | IZcapQuery

/**
 * @see https://w3c-ccg.github.io/vp-request-spec/#query-by-example
 */
export type IQueryByExample = {
  type: "QueryByExample";
  credentialQuery: {
    reason?: string;
    example: {
      "@context"?: string | object | Array<string | object>;
      type?: string | string[];
      issuer?: string | object | Array<string | object>;
      [x: string]: any;
    }
  }
}

/**
 * @see https://w3c-ccg.github.io/vp-request-spec/#the-did-authentication-query-format
 */
export type IDidAuthenticationQuery = {
  type: "DIDAuthentication";
  acceptedMethods?: Array<{ method: string }>;
  acceptedCryptosuites?: Array<{ cryptosuite: string }>;
}

/**
 * @see https://w3c-ccg.github.io/vp-request-spec/#authorization-capability-request
 */
export type IZcapQuery = {
  type: "ZcapQuery";
  capabilityQuery: {
    referenceId?: string;
    reason?: string;
    allowedAction?: string | object | Array<string | object>;
    controller: string | string[];
    invocationTarget: string | object | Array<string | object>;
  };
  challenge?: string;
}

export type IZcap = {
  "@context"?: string | object | Array<string | object>;
  id: `urn:zcap:${string}`;
  controller: string | string[];
  invocationTarget: string | object | Array<string | object>;
  referenceId?: string;
  allowedAction?: string | object | Array<string | object>;
  parentCapability?: string | Array<string | object>;
  expires?: string;
  proof: any;
}
