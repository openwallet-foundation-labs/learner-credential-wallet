/**
 * Decides what to do with the result of a VC-API exchange, based on what the
 * wallet actually sent and what the exchanger replied.
 *
 * Kept free of React Native dependencies so it can be unit tested in Node.
 */
import { IVerifiableCredential } from '@digitalcredentials/ssi'
import { HumanReadableError } from './error'
import { WalletApiMessage } from './walletRequestApi'

/**
 * What the wallet posted in reply to a request.
 * - posted: false when the wallet ended the exchange without replying.
 * - credentials: the credentials in the VP it sent (empty for DIDAuth).
 * - didAuth: whether the VP it sent was a DIDAuthentication proof.
 * - zcaps: whether it granted any zcaps.
 */
export type ISentSummary = {
  posted: boolean
  credentials: IVerifiableCredential[]
  didAuth: boolean
  zcaps: boolean
}

export type IMessage = { title: string; body: string }

/**
 * How the wallet is talking to the requester:
 * - vcapi: a VC-API exchange (an exchange invitation or interaction URL).
 * - redirect: a deep-link request whose reply goes to its redirectUrl.
 */
export type ExchangeChannel = 'vcapi' | 'redirect'

/**
 * Returns true when the exchanger's reply asks for another step (a further
 * presentation request, or an invitation to another exchange) instead of
 * delivering credentials or ending the exchange.
 */
export function isFollowUpStep(reply: unknown): boolean {
  if (!reply || typeof reply !== 'object') return false
  const fields = reply as Record<string, unknown>
  if (fields.verifiablePresentation != null) return false
  return (
    fields.verifiablePresentationRequest != null || fields.protocols != null
  )
}

/**
 * Returns true when an exchanger's answer to the initial POST {} is something
 * the wallet can act on: an offer (VP) or a presentation request. A null,
 * non-object or empty answer is not.
 */
export function isActionableExchangeMessage(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const fields = message as Record<string, unknown>
  return (
    fields.verifiablePresentation != null ||
    fields.verifiablePresentationRequest != null
  )
}

export const NOTHING_TO_ACT_ON: IMessage = {
  title: 'Nothing to Do',
  body: "This request didn't contain anything this wallet can act on."
}

/**
 * Returns the credentials from an exchange result to offer the user for
 * storing.
 *
 * - Offer: everything in it.
 * - Request: whatever came back, but only if the wallet posted a reply that
 *   shared no credentials (DIDAuthentication, zcaps, or a credential query it
 *   had no match for). An issuer that only needed to learn the holder DID
 *   returns newly issued credentials here.
 * - Request where the wallet shared any credential: nothing, ever. What comes
 *   back may be an echo or another credential the verifier chose to return,
 *   and the wallet cannot tell them apart reliably.
 * - A reply asking for another step: nothing.
 * - Request on a deep link's redirectUrl: nothing, as before VC-API issuance
 *   after DIDAuth was supported; only VC-API exchanges issue this way.
 *
 * @param answered - The offer or request the wallet answered.
 * @param channel - Whether the request came over a VC-API exchange or a
 *   deep link's redirectUrl.
 * @param sent - What the wallet posted in reply to a request.
 * @param nextStep - The exchanger's reply asked for another step.
 * @param receivedCredentials - Credentials from the offer, or from the
 *   exchanger's reply.
 */
export function credentialsToOffer({
  answered,
  channel,
  sent,
  nextStep,
  receivedCredentials
}: {
  answered: WalletApiMessage
  channel: ExchangeChannel
  sent?: ISentSummary
  nextStep?: boolean
  receivedCredentials?: IVerifiableCredential[] | null
}): IVerifiableCredential[] {
  if (!receivedCredentials || !answered || nextStep) return []
  if ('verifiablePresentation' in answered) return receivedCredentials
  if (!('verifiablePresentationRequest' in answered)) return []
  if (channel !== 'vcapi') return []
  if (!sent?.posted || sent.credentials.length > 0) return []
  return receivedCredentials
}

/**
 * The message to show when an exchange ends with nothing to offer for
 * storing, or undefined when there is nothing to say. Only call it when
 * credentialsToOffer returned nothing.
 *
 * @param answered - The offer or request the wallet answered.
 * @param channel - Whether the request came over a VC-API exchange or a
 *   deep link's redirectUrl.
 * @param sent - What the wallet posted in reply to a request.
 * @param nextStep - The exchanger's reply asked for another step.
 * @param receivedCredentials - Credentials the exchanger sent back. On a
 *   VC-API exchange, any that came back but weren't offered are mentioned.
 */
export function exchangeCompletionMessage({
  answered,
  channel,
  sent,
  nextStep,
  receivedCredentials
}: {
  answered: WalletApiMessage
  channel: ExchangeChannel
  sent?: ISentSummary
  nextStep?: boolean
  receivedCredentials?: IVerifiableCredential[] | null
}): IMessage | undefined {
  if (!answered) return undefined
  if (nextStep) {
    const alreadySent = whatWasSent(sent, { uncertain: false, ending: '.' })
    const body =
      "This request needs another step that this wallet doesn't support yet."
    return {
      title: 'Request Incomplete',
      body: alreadySent ? `${body} ${alreadySent}` : body
    }
  }
  if ('verifiablePresentation' in answered) {
    return {
      title: 'No Credentials',
      body: "This offer didn't include any credentials."
    }
  }
  if (!('verifiablePresentationRequest' in answered)) return undefined

  const message = requestCompletionMessage(sent)
  // Credentials that came back but weren't offered (e.g. after a share)
  const returnedNotSaved =
    channel === 'vcapi' &&
    !!receivedCredentials &&
    receivedCredentials.length > 0
  return returnedNotSaved
    ? {
        ...message,
        body: `${message.body} The service also sent back credentials, which weren't saved.`
      }
    : message
}

function requestCompletionMessage(sent?: ISentSummary): IMessage {
  const sharedCredentials = !!sent?.posted && sent.credentials.length > 0
  const didAuth = !!sent?.posted && sent.didAuth
  const zcaps = !!sent?.posted && sent.zcaps

  if (sharedCredentials) {
    return {
      title: 'Success',
      body: zcaps
        ? 'You have shared the selected credentials and granted storage access.'
        : 'You have shared the selected credentials.'
    }
  }
  if (didAuth) {
    return {
      title: 'Success',
      body: zcaps
        ? 'DID Authentication complete. Storage access granted.'
        : 'DID Authentication complete.'
    }
  }
  if (zcaps) {
    return { title: 'Success', body: 'Storage access granted.' }
  }
  // Nothing posted, or nothing of substance in what was posted
  return { title: 'Nothing Shared', body: 'Nothing was shared.' }
}

/**
 * Why a VC-API exchange endpoint call failed:
 * - rejected: a 4xx other than 404/410 and 408/429.
 * - busy: 408 or 429, a transient condition on the service's side.
 * - gone: 404 or 410, the exchange has expired or never existed.
 * - server-error: a 5xx, the service answered but failed.
 * - unreachable: no HTTP response at all.
 * - unreadable: a successful status whose body could not be read or is not
 *   JSON (e.g. an HTML or proxy page), or a non-2xx status below 400 (e.g. a
 *   redirect), so the reply's content is unknown.
 */
export type ExchangeFailureKind =
  | 'rejected'
  | 'busy'
  | 'gone'
  | 'server-error'
  | 'unreachable'
  | 'unreadable'

export function failureKindForStatus(status: number): ExchangeFailureKind {
  // Not an error status but not a usable reply either (e.g. a redirect)
  if (status < 400) return 'unreadable'
  if (status === 404 || status === 410) return 'gone'
  if (status === 408 || status === 429) return 'busy'
  if (status >= 500) return 'server-error'
  return 'rejected'
}

type ExchangeFailureDetails = {
  status?: number
  // What the wallet had posted, when the failing call was its reply
  sentBefore?: ISentSummary
  // The underlying error (e.g. a network failure), for diagnosis
  cause?: unknown
}

/**
 * Thrown for a failed call to a VC-API exchange endpoint. Its title and
 * message are safe to show to the user: they are written by the wallet,
 * never taken from the exchanger, and say what had already been sent.
 */
export class ExchangeFailedError extends HumanReadableError {
  readonly isExchangeFailure = true
  readonly kind: ExchangeFailureKind
  readonly details: ExchangeFailureDetails
  readonly title: string
  readonly cause?: unknown

  constructor(kind: ExchangeFailureKind, details: ExchangeFailureDetails = {}) {
    const { title, body } = exchangeFailureMessage(kind, details)
    super(body)
    this.kind = kind
    this.details = details
    this.title = title
    this.cause = details.cause
  }

  /** The same failure, noting what the wallet had already posted. */
  withSentBefore(sentBefore: ISentSummary): ExchangeFailedError {
    return new ExchangeFailedError(this.kind, { ...this.details, sentBefore })
  }
}

export function isExchangeFailedError(
  err: unknown
): err is ExchangeFailedError {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as ExchangeFailedError).isExchangeFailure === true
  )
}

/**
 * The message for a failed exchange call: what went wrong, then what had
 * already left the device. It never includes text from the exchanger. When
 * no HTTP response arrived, whether the reply reached the exchanger is
 * unknown, so it says "may have". Only a failure before the wallet sent
 * anything (the initial POST {}) suggests trying again; after that the
 * one-time exchange may already be used up.
 */
export function exchangeFailureMessage(
  kind: ExchangeFailureKind,
  { sentBefore }: ExchangeFailureDetails = {}
): IMessage {
  const sentAnything = !!sentBefore?.posted
  let title: string
  let body: string
  if (kind === 'gone') {
    title = 'Request Expired'
    body = 'This request has expired or no longer exists.'
  } else if (kind === 'busy') {
    title = 'Service Busy'
    body = sentAnything
      ? 'The service is busy.'
      : 'The service is busy. Try again later.'
  } else if (kind === 'server-error') {
    title = 'Service Error'
    body = 'The service had a problem with this request.'
  } else if (kind === 'unreachable') {
    title = 'Service Unavailable'
    body = sentAnything
      ? "The service couldn't be reached."
      : "The service couldn't be reached. Try again later."
  } else if (kind === 'unreadable') {
    title = 'Request Incomplete'
    body = sentAnything
      ? "The service's reply couldn't be read."
      : "The service's reply couldn't be read. Try again later."
  } else {
    title = 'Request Rejected'
    body = 'The request was rejected.'
  }
  const alreadySent = whatWasSent(sentBefore, {
    uncertain: kind === 'unreachable',
    ending: ' before the error.'
  })
  return { title, body: alreadySent ? `${body} ${alreadySent}` : body }
}

/**
 * A sentence saying what the wallet had already posted, e.g. "Your selected
 * credentials were sent before the error." Undefined if it posted nothing.
 */
function whatWasSent(
  sent: ISentSummary | undefined,
  { uncertain, ending }: { uncertain: boolean; ending: string }
): string | undefined {
  if (!sent?.posted) return undefined
  const wasSent = uncertain ? 'may have been sent' : 'were sent'
  const singularSent = uncertain ? 'may have been sent' : 'was sent'
  const granted = uncertain ? 'may have been granted' : 'was granted'

  const parts: string[] = []
  if (sent.credentials.length > 0) {
    parts.push(`your selected credentials ${wasSent}`)
  } else if (sent.didAuth) {
    parts.push(`your DID Authentication response ${singularSent}`)
  }
  if (sent.zcaps) parts.push(`storage access ${granted}`)
  if (parts.length === 0) return undefined

  const sentence = `${parts.join(' and ')}${ending}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
