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
 *
 * @param answered - The offer or request the wallet answered.
 * @param sent - What the wallet posted in reply to a request.
 * @param nextStep - The exchanger's reply asked for another step.
 * @param receivedCredentials - Credentials from the offer, or from the
 *   exchanger's reply.
 */
export function credentialsToOffer({
  answered,
  sent,
  nextStep,
  receivedCredentials
}: {
  answered: WalletApiMessage
  sent?: ISentSummary
  nextStep?: boolean
  receivedCredentials?: IVerifiableCredential[] | null
}): IVerifiableCredential[] {
  if (!receivedCredentials || !answered || nextStep) return []
  if ('verifiablePresentation' in answered) return receivedCredentials
  if (!('verifiablePresentationRequest' in answered)) return []
  if (!sent?.posted || sent.credentials.length > 0) return []
  return receivedCredentials
}

/**
 * The message to show when an exchange ends with nothing to offer for
 * storing, or undefined when there is nothing to say. Only call it when
 * credentialsToOffer returned nothing.
 *
 * @param answered - The offer or request the wallet answered.
 * @param sent - What the wallet posted in reply to a request.
 * @param nextStep - The exchanger's reply asked for another step.
 */
export function exchangeCompletionMessage({
  answered,
  sent,
  nextStep
}: {
  answered: WalletApiMessage
  sent?: ISentSummary
  nextStep?: boolean
}): IMessage | undefined {
  if (!answered) return undefined
  if (nextStep) {
    return {
      title: 'Request Incomplete',
      body: "This request needs another step that this wallet doesn't support yet."
    }
  }
  if ('verifiablePresentation' in answered) {
    return {
      title: 'No Credentials',
      body: "This offer didn't include any credentials."
    }
  }
  if (!('verifiablePresentationRequest' in answered)) return undefined

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

const MAX_DETAIL_LENGTH = 200

/**
 * Why a VC-API exchange endpoint call failed:
 * - rejected: a 4xx other than 404/410.
 * - gone: 404 or 410, the exchange has expired or never existed.
 * - unreachable: a 5xx, or no response at all.
 */
export type ExchangeFailureKind = 'rejected' | 'gone' | 'unreachable'

export function failureKindForStatus(status: number): ExchangeFailureKind {
  if (status === 404 || status === 410) return 'gone'
  if (status >= 500) return 'unreachable'
  return 'rejected'
}

type ExchangeFailureDetails = {
  status?: number
  // The exchanger's own error name/message, if it gave one
  detail?: string
  // No HTTP response arrived, so whether the request got there is unknown
  networkError?: boolean
  // What the wallet had posted, when the failing call was its reply
  sentBefore?: ISentSummary
}

/**
 * Thrown for a failed call to a VC-API exchange endpoint. Its message is safe
 * to show to the user and says what had already been sent.
 */
export class ExchangeFailedError extends HumanReadableError {
  readonly isExchangeFailure = true
  readonly kind: ExchangeFailureKind
  readonly details: ExchangeFailureDetails

  constructor(kind: ExchangeFailureKind, details: ExchangeFailureDetails = {}) {
    super(exchangeFailureMessage(kind, details).body)
    this.kind = kind
    this.details = details
  }

  /** The same failure, noting what the wallet had already posted. */
  withSentBefore(sentBefore: ISentSummary): ExchangeFailedError {
    return new ExchangeFailedError(this.kind, { ...this.details, sentBefore })
  }

  get title(): string {
    return exchangeFailureMessage(this.kind, this.details).title
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
 * already left the device. When no HTTP response arrived, whether the reply
 * reached the exchanger is unknown, so it says "may have".
 */
export function exchangeFailureMessage(
  kind: ExchangeFailureKind,
  { detail, networkError, sentBefore }: ExchangeFailureDetails = {}
): IMessage {
  let title: string
  let body: string
  if (kind === 'gone') {
    title = 'Request Expired'
    body = 'This request has expired or no longer exists.'
  } else if (kind === 'unreachable') {
    title = 'Service Unavailable'
    body = "The service couldn't be reached. Try again later."
  } else {
    title = 'Request Rejected'
    body = detail
      ? `The request was rejected. ${detail}`
      : 'The request was rejected.'
  }
  const alreadySent = sentBeforeError(sentBefore, !!networkError)
  return { title, body: alreadySent ? `${body} ${alreadySent}` : body }
}

function sentBeforeError(
  sent: ISentSummary | undefined,
  uncertain: boolean
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

  const sentence = `${parts.join(' and ')} before the error.`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/**
 * Extracts a short, human-readable error name and/or message from an
 * exchanger's error body, if it is JSON with one. Understands
 * { name, message }, { error: string | { name, message } } and
 * problem+json { title, detail }.
 */
export function exchangerErrorDetail(bodyText?: string): string | undefined {
  if (!bodyText) return undefined
  let body: any
  try {
    body = JSON.parse(bodyText)
  } catch {
    return undefined
  }
  if (!body || typeof body !== 'object') return undefined

  const source =
    body.error && typeof body.error === 'object' ? body.error : body
  const name = asText(source.name) ?? asText(body.title)
  const message =
    asText(source.message) ??
    asText(body.detail) ??
    (typeof body.error === 'string' ? asText(body.error) : undefined)

  const detail =
    name && message && name !== message
      ? `${name}: ${message}`
      : (message ?? name)
  if (!detail) return undefined
  return detail.length > MAX_DETAIL_LENGTH
    ? `${detail.slice(0, MAX_DETAIL_LENGTH - 1)}…`
    : detail
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
