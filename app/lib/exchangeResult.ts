/**
 * Decides what to do with the result of a VC-API exchange, based on what the
 * wallet actually sent rather than on the shape of the request.
 *
 * Kept free of React Native dependencies so it can be unit tested in Node.
 */
import { IVerifiableCredential } from '@digitalcredentials/ssi'
import { canonicalCredentialJson } from './credentialHash'
import { WalletApiMessage } from './walletRequestApi'

function isSameCredential(
  a: IVerifiableCredential,
  b: IVerifiableCredential
): boolean {
  if (a.id && b.id) return a.id === b.id
  return canonicalCredentialJson(a) === canonicalCredentialJson(b)
}

/**
 * Returns the credentials from an exchange result that should be offered to
 * the user for storing: every received credential that is not one the wallet
 * itself just sent. A verifier echoing back the shared VP yields nothing;
 * anything newly issued is offered, whatever the request asked for.
 *
 * Credentials match by `id` when both have one, otherwise by canonical
 * content.
 *
 * @param sentCredentials - Credentials the wallet put in the VP it sent
 *   (empty or undefined when it sent none, e.g. for an offer or DIDAuth).
 * @param receivedCredentials - Credentials extracted from the exchange result.
 */
export function credentialsToOffer({
  sentCredentials = [],
  receivedCredentials
}: {
  sentCredentials?: IVerifiableCredential[]
  receivedCredentials?: IVerifiableCredential[] | null
}): IVerifiableCredential[] {
  if (!receivedCredentials) return []
  return receivedCredentials.filter(
    (received) =>
      !sentCredentials.some((sent) => isSameCredential(received, sent))
  )
}

function queryTypes(message: WalletApiMessage): string[] {
  if (!('verifiablePresentationRequest' in message)) return []
  const { query } = message.verifiablePresentationRequest
  const queries = Array.isArray(query) ? query : query ? [query] : []
  return queries.map((q) => q?.type)
}

/**
 * The message to show when an exchange ends with nothing to offer for
 * storing, or undefined when there is nothing to say.
 *
 * @param answered - The offer or request the wallet answered.
 * @param sentCredentials - Credentials the wallet shared in its response.
 */
export function exchangeCompletionMessage({
  answered,
  sentCredentials = []
}: {
  answered: WalletApiMessage
  sentCredentials?: IVerifiableCredential[]
}): { title: string; body: string } | undefined {
  if ('verifiablePresentation' in answered) {
    return {
      title: 'No Credentials',
      body: "This offer didn't include any credentials."
    }
  }
  if (!('verifiablePresentationRequest' in answered)) return undefined

  if (sentCredentials.length > 0) {
    return {
      title: 'Success',
      body: 'You have shared the selected credentials.'
    }
  }
  if (queryTypes(answered).includes('DIDAuthentication')) {
    return { title: 'Success', body: 'DID Authentication complete.' }
  }
  return { title: 'Success', body: 'Request complete.' }
}
