/**
 * Decides what to do with the result of a VC-API exchange, based on what the
 * wallet actually sent.
 *
 * Kept free of React Native dependencies so it can be unit tested in Node.
 */
import { IVerifiableCredential } from '@digitalcredentials/ssi'
import { queriesOf, WalletApiMessage } from './walletRequestApi'

/**
 * What the wallet posted in reply to a request.
 * - posted: false when the wallet ended the exchange without replying.
 * - credentials: the credentials in the VP it sent (empty for DIDAuth).
 * - zcaps: whether it granted any zcaps.
 */
export type ISentSummary = {
  posted: boolean
  credentials: IVerifiableCredential[]
  zcaps: boolean
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
 *
 * @param answered - The offer or request the wallet answered.
 * @param sent - What the wallet posted in reply to a request.
 * @param receivedCredentials - Credentials from the offer, or from the
 *   exchanger's reply.
 */
export function credentialsToOffer({
  answered,
  sent,
  receivedCredentials
}: {
  answered: WalletApiMessage
  sent?: ISentSummary
  receivedCredentials?: IVerifiableCredential[] | null
}): IVerifiableCredential[] {
  if (!receivedCredentials || !answered) return []
  if ('verifiablePresentation' in answered) return receivedCredentials
  if (!('verifiablePresentationRequest' in answered)) return []
  if (!sent?.posted || sent.credentials.length > 0) return []
  return receivedCredentials
}

/**
 * The message to show when an exchange ends with nothing to offer for
 * storing, or undefined when there is nothing to say.
 *
 * @param answered - The offer or request the wallet answered.
 * @param sent - What the wallet posted in reply to a request.
 */
export function exchangeCompletionMessage({
  answered,
  sent
}: {
  answered: WalletApiMessage
  sent?: ISentSummary
}): { title: string; body: string } | undefined {
  if (!answered) return undefined
  if ('verifiablePresentation' in answered) {
    return {
      title: 'No Credentials',
      body: "This offer didn't include any credentials."
    }
  }
  if (!('verifiablePresentationRequest' in answered)) return undefined

  const nothingShared = { title: 'Nothing Shared', body: 'Nothing was shared.' }
  if (!sent?.posted) return nothingShared
  if (sent.credentials.length > 0) {
    return {
      title: 'Success',
      body: 'You have shared the selected credentials.'
    }
  }
  // A DIDAuthentication query always results in a signed VP being posted
  const didAuthSent = queriesOf(answered.verifiablePresentationRequest).some(
    (q) => q.type === 'DIDAuthentication'
  )
  if (didAuthSent) {
    return { title: 'Success', body: 'DID Authentication complete.' }
  }
  if (sent.zcaps) {
    return { title: 'Success', body: 'Storage access granted.' }
  }
  // An empty reply was posted, e.g. the user deselected every credential
  return nothingShared
}
