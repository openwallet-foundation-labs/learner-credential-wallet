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
  if ('verifiablePresentation' in reply) return false
  return 'verifiablePresentationRequest' in reply || 'protocols' in reply
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

const REJECTED = 'The request was rejected.'
const MAX_DETAIL_LENGTH = 200

/**
 * Thrown when the exchanger answers with a non-OK HTTP status. The message is
 * safe to show to the user.
 */
export class ExchangeRejectedError extends HumanReadableError {
  readonly isExchangeRejection = true
  readonly status: number

  constructor(status: number, detail?: string) {
    super(detail ? `${REJECTED} ${detail}` : REJECTED)
    this.status = status
  }
}

export function isExchangeRejectedError(
  err: unknown
): err is ExchangeRejectedError {
  return (
    !!err &&
    typeof err === 'object' &&
    (err as ExchangeRejectedError).isExchangeRejection === true
  )
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
