import { CredentialRecordRaw, VcQueryType } from '../types/credential'
import { filterCredentialRecordsByType } from './credentialMatching'
import {
  IVerifiableCredential,
  IVerifiablePresentation
} from '@digitalcredentials/ssi'
import {
  processZcaps,
  isDidAuthRequested,
  queriesOf,
  IVpOffer,
  IVprDetails,
  IVpRequest,
  IVprQuery,
  IZcap,
  zcapsRequested
} from './walletRequestApi'
import { extractCredentialsFrom } from './verifiableObject'
import {
  ExchangeFailedError,
  failureKindForStatus,
  isExchangeFailedError,
  isFollowUpStep,
  ISentSummary
} from './exchangeResult'
import { selectCredentials } from './selectCredentials'
import { ISelectedProfile } from './did'
import { composeVp } from './composeVp'
import { IController } from './getWasController'

type IResponseToExchanger = {
  verifiablePresentation?: IVerifiablePresentation
  zcap?: IZcap[]
}

type IModalOptions = {
  enabled: boolean
  confirmZcapRequest?: () => Promise<boolean>
}

/**
 * Recursively processes one or more VC API exchange messages.
 * If necessary, prompt the user to select which VCs to send.
 *
 * @param exchangeUrl {string}
 * @param requestOrOffer - Exchange message to process.
 * @param selectedProfile {ISelectedProfile} - Selected DID profile, containing
 *   key signers used for DIDAuthentication and zCap delegation.
 * @param wasController {IController} - Root zcap controller and signer for
 *   Wallet Attached Storage.
 * @param modals {object} - Options for popup modal windows.
 * @param modals.enabled {boolean} - Whether to present the user
 *   with an interactive modal popup to confirm sending credentials.
 *   Disabled for unit testing.
 * @param modals.confirmZcapRequest {function}
 * @param checkStatus {boolean} - exchangeUrl is a VC-API exchange endpoint,
 *   so a failed reply to it is reported as an ExchangeFailedError. Off for a
 *   deep-link request's redirectUrl, whose reply is not checked.
 * @returns receivedCredentials - credentials in the offer, or in the
 *   exchanger's reply to a request; sent - what the wallet posted in reply to
 *   a request (undefined for an offer); nextStep - the exchanger's reply asked
 *   for a further step, which is not processed.
 * @throws ExchangeFailedError if checkStatus is set and the exchanger
 *   rejects the wallet's reply or cannot be reached.
 */
export async function processMessageChain({
  exchangeUrl,
  requestOrOffer,
  selectedProfile,
  wasController,
  modals,
  checkStatus = false
}: {
  exchangeUrl?: string
  requestOrOffer: IVpRequest | IVpOffer
  selectedProfile: ISelectedProfile
  wasController: IController
  modals: IModalOptions
  checkStatus?: boolean
}): Promise<{
  receivedCredentials?: IVerifiableCredential[]
  sent?: ISentSummary
  nextStep?: boolean
  redirectUrl?: string
}> {
  const { redirectUrl, credentialRequestOrigin } = requestOrOffer

  if ('verifiablePresentation' in requestOrOffer) {
    // This is an offer, return extracted credentials for user approval
    const offer =
      requestOrOffer.verifiablePresentation as IVerifiablePresentation
    console.log('Extracting VCs from VP offer.')
    return {
      receivedCredentials: extractCredentialsFrom(offer) ?? [],
      redirectUrl
    }
  }

  if ('verifiablePresentationRequest' in requestOrOffer) {
    console.log('Processing request...')
    const request = requestOrOffer.verifiablePresentationRequest as IVprDetails
    const { response, sent } = await processRequest({
      request,
      exchangeUrl,
      selectedProfile,
      modals,
      credentialRequestOrigin,
      wasController,
      checkStatus
    })

    const receivedCredentials = response?.verifiablePresentation
      ? (extractCredentialsFrom(response.verifiablePresentation) ?? [])
      : []
    const nextStep = isFollowUpStep(response)
    if (nextStep) {
      console.log('[processMessageChain] Exchanger asked for another step.')
    }
    return { receivedCredentials, sent, nextStep, redirectUrl }
  }

  console.log('[processMessageChain] No offer or request found, exiting...')
  return {}
}

/**
 *
 * @param request
 * @param exchangeUrl {string}
 * @param selectedProfile {ISelectedProfile} - Selected DID profile, containing
 *   key signers used for DIDAuthentication and zCap delegation.
 * @param credentialRequestOrigin {string}
 * @param wasController {IController} - Root zcap controller and signer for
 *   Wallet Attached Storage.
 * @param modals {object} - Options for popup modal windows.
 * @param modals.enabled {boolean} - Whether to present the user
 *   with an interactive modal popup to confirm sending credentials.
 *   Disabled for unit testing.
 * @param modals.confirmZcapRequest {function}
 * @param checkStatus {boolean} - See processMessageChain.
 */
export async function processRequest({
  request,
  exchangeUrl,
  selectedProfile,
  credentialRequestOrigin,
  wasController,
  modals,
  checkStatus = false
}: {
  request: IVprDetails
  exchangeUrl?: string
  selectedProfile: ISelectedProfile
  credentialRequestOrigin?: string
  wasController: IController
  modals: IModalOptions
  checkStatus?: boolean
}): Promise<{
  // The exchanger's reply, if the wallet posted anything
  response?: any
  sent: ISentSummary
}> {
  if (!exchangeUrl) {
    throw new Error('Missing exchangeUrl, cannot send response.')
  }

  // TODO: Display origin in consent modals
  console.log('credentialRequestOrigin: ', credentialRequestOrigin)

  const queries = queriesOf(request)
  /**
   * Queries come in 3 types:
   * 1. VC "queries by example" - requester wants one or more VCs.
   * 2. DIDAuth - requester wants a proof of DID Authentication, which is a
   *    signed VerifiablePresentation.
   * 3. zCap queries - requester wants permission/capabilities to do something.
   */
  const vcMatches = await vcMatchesFor({ queries, selectedProfile })

  console.log('VC MATCHES:', vcMatches)

  const didAuthRequested = isDidAuthRequested({ queries })
  // challenge and domain are only relevant for DID Auth
  const { challenge, domain } = request

  console.log('isDidAuthRequested', didAuthRequested, challenge, domain)

  let { zcapRequests } = zcapsRequested({ queries })

  console.log('zcapRequests:', zcapRequests)

  let zcapUserConsent, zcaps
  if (zcapRequests && modals.enabled) {
    zcapUserConsent = await modals.confirmZcapRequest!()
  } else {
    zcapUserConsent = true
  }
  if (zcapRequests && zcapUserConsent) {
    zcaps = await processZcaps({ zcapRequests, wasController })
  }

  const zcapsGranted = !!zcaps && zcaps.length > 0
  if (vcMatches.length === 0 && !zcapsGranted && !didAuthRequested) {
    // No matches were found, nothing to send to requester
    console.log(
      '[processMessageChain] No zcaps or VCs matched request query, ending exchange.'
    )
    return {
      sent: { posted: false, credentials: [], didAuth: false, zcaps: false }
    }
    // TODO: At some point, we should probably inform the user that no matches were found
  }

  // We have zcap or VC matches, compose the response
  const walletResponse: IResponseToExchanger = {}

  // If any zcaps were requested and granted, add them to response
  if (zcapsGranted) {
    walletResponse.zcap = zcaps
  }

  console.log('About to select...')

  // If there are any VC matches, prompt the user to confirm
  let selectedVcs: IVerifiableCredential[] = []
  if (vcMatches.length > 0 && modals.enabled) {
    // Prompt user to confirm / select which VCs to send
    selectedVcs = (await selectCredentials(vcMatches)).map((r) => r.credential)
  } else if (vcMatches.length > 0) {
    // Not prompting the user
    selectedVcs = vcMatches.map((r) => r.credential)
  }

  console.log('SELECTED VCS:', selectedVcs)

  // Compose a VerifiablePresentation (to send to the requester) if appropriate
  if (didAuthRequested || selectedVcs.length > 0) {
    walletResponse.verifiablePresentation = await composeVp({
      selectedProfile,
      selectedVcs,
      challenge,
      domain,
      didAuthRequested
    })
  }

  const sent: ISentSummary = {
    posted: true,
    credentials: selectedVcs,
    // A DIDAuth request always results in a signed VP being posted
    didAuth: didAuthRequested,
    zcaps: !!walletResponse.zcap
  }
  let responseFromExchanger
  try {
    responseFromExchanger = await sendToExchanger({
      exchangeUrl,
      payload: walletResponse,
      checkStatus
    })
  } catch (err) {
    // Tell the user what had already left the device
    if (isExchangeFailedError(err)) throw err.withSentBefore(sent)
    throw err
  }
  console.log('Response from Exchanger: ', responseFromExchanger)
  return { response: responseFromExchanger, sent }
}

/**
 * Processes VC "Query by Example" queries against credentials stored in the
 * selected profile. Returns any matches.
 */
export async function vcMatchesFor({
  queries,
  selectedProfile
}: {
  queries: IVprQuery[]
  selectedProfile: ISelectedProfile
}): Promise<CredentialRecordRaw[]> {
  const vcQueries = queries.filter((q) => q.type === VcQueryType.Example)
  if (vcQueries.length === 0) {
    console.log('No VCs were requested in the query.')
    return []
  }
  let matches = [] as CredentialRecordRaw[]
  const allCredentialRecords = await selectedProfile.loadCredentials()
  for (const query of vcQueries) {
    matches = matches.concat(
      filterCredentialRecordsByType(allCredentialRecords, query)
    )
  }
  return matches
}

/**
 * Sends the Wallet Response object (which may contain a VP or zcaps) to the
 * exchanger.
 *
 * @param exchangeUrl
 * @param payload {{ verifiablePresentation, zcap }}
 * @param checkStatus {boolean} - Set for VC-API exchange endpoints: a non-OK
 *   status or a network failure throws ExchangeFailedError, so an error reply
 *   is never mistaken for a successful step, and a successful status with an
 *   empty or non-JSON body resolves to null. When unset (a deep-link
 *   request's redirectUrl), the reply is parsed whatever its status, as it
 *   always has been.
 */
export async function sendToExchanger({
  exchangeUrl,
  payload,
  checkStatus = false
}: {
  exchangeUrl: string
  payload: {
    verifiablePresentation?: IVerifiablePresentation
    zcap?: IZcap[]
  }
  checkStatus?: boolean
}): Promise<any> {
  if (!checkStatus) {
    // A deep-link request's redirectUrl: parsed whatever the status
    try {
      const exchangeResponseRaw = await fetch(exchangeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const text = await exchangeResponseRaw.text()
      return text ? JSON.parse(text) : null
    } catch (err) {
      console.log(`Error sending to Exchanger endpoint "${exchangeUrl}".`)
      throw err
    }
  }

  let exchangeResponseRaw: Response
  try {
    exchangeResponseRaw = await fetch(exchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.log(`Could not reach Exchanger endpoint "${exchangeUrl}".`, err)
    throw new ExchangeFailedError('unreachable', { cause: err })
  }

  const { status, ok } = exchangeResponseRaw
  let text: string | undefined
  let readError: unknown
  try {
    text = await exchangeResponseRaw.text()
  } catch (err) {
    // The status arrived, so classify by it rather than as a network error
    readError = err
    console.log(`Could not read the reply from "${exchangeUrl}".`, err)
  }

  if (!ok) {
    // The exchanger's error body is logged for diagnosis but never shown:
    // it is not the wallet's text to put in front of the user
    console.log(
      `Exchanger "${exchangeUrl}" replied HTTP ${status}:`,
      text?.slice(0, 1000)
    )
    throw new ExchangeFailedError(failureKindForStatus(status), {
      status,
      cause: readError
    })
  }

  // A successful status with an empty, unreadable or non-JSON body is a
  // reply with nothing further in it
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (err) {
    console.log(
      `Exchanger "${exchangeUrl}" replied HTTP ${status} with a non-JSON body.`,
      err
    )
    return null
  }
}
