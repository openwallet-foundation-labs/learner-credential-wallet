import { it, describe } from 'node:test'
import assert from 'node:assert'
import {
  isDIDAuthOnlyRequest,
  shouldStoreExchangeCredentials,
  WalletApiMessage
} from '../app/lib/walletRequestApi'
import { extractCredentialsFrom } from '../app/lib/verifiableObject'
import { mockCredential } from '../app/mock/credential'

/**
 * Mirrors the decision ExchangeCredentials makes once processMessageChain
 * returns: given the message the wallet answered and the VP that came back,
 * should the returned credentials be offered for storing?
 */
function decide(
  answered: WalletApiMessage,
  returnedVp?: Record<string, unknown>
): boolean {
  return shouldStoreExchangeCredentials({
    isVPRFlow: 'verifiablePresentationRequest' in answered,
    isDIDAuthOnly: isDIDAuthOnlyRequest(answered),
    receivedCredentials: returnedVp
      ? extractCredentialsFrom(returnedVp as any)
      : undefined
  })
}

const vpWith = (...credentials: unknown[]) => ({
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  verifiableCredential: credentials
})

const issuedCredential = {
  ...mockCredential,
  id: 'urn:uuid:newly-issued',
  credentialSubject: {
    ...(mockCredential as any).credentialSubject,
    id: 'did:key:z6MkHolder'
  }
}

const didAuthRequest: WalletApiMessage = {
  verifiablePresentationRequest: {
    query: [{ type: 'DIDAuthentication' }],
    challenge: 'c0ae1c8e-c7e7-469f-b252-86e6a0e7387e',
    domain: 'issuer.example'
  }
} as any

const queryByExampleRequest: WalletApiMessage = {
  verifiablePresentationRequest: {
    query: [
      {
        type: 'QueryByExample',
        credentialQuery: {
          reason: 'Please present your credential.',
          example: { type: 'OpenBadgeCredential' }
        }
      }
    ],
    challenge: 'b7e2a3f0-1d9a-4c4e-9b0e-4c1f6d1b2a10',
    domain: 'verifier.example'
  }
} as any

const mixedRequest: WalletApiMessage = {
  verifiablePresentationRequest: {
    query: [
      { type: 'DIDAuthentication' },
      {
        type: 'QueryByExample',
        credentialQuery: { example: { type: 'OpenBadgeCredential' } }
      }
    ],
    challenge: '1f0e6a52-3a3c-4d5c-8a39-0a3b1c3b8f77',
    domain: 'verifier.example'
  }
} as any

describe('shouldStoreExchangeCredentials', () => {
  it('stores credentials from an offer', () => {
    const offer = vpWith(mockCredential)
    assert.strictEqual(
      decide({ verifiablePresentation: offer } as any, offer),
      true
    )
  })

  it('stores a credential issued after a DIDAuthentication-only request', () => {
    assert.strictEqual(decide(didAuthRequest, vpWith(issuedCredential)), true)
  })

  it('accepts a DIDAuthentication query that is not wrapped in an array', () => {
    const request = {
      verifiablePresentationRequest: {
        query: { type: 'DIDAuthentication' },
        challenge: 'x',
        domain: 'issuer.example'
      }
    } as any
    assert.strictEqual(decide(request, vpWith(issuedCredential)), true)
  })

  it('does not store a VP echoed back after a QueryByExample request', () => {
    assert.strictEqual(
      decide(queryByExampleRequest, vpWith(mockCredential)),
      false
    )
  })

  it('does not store after a request mixing DIDAuthentication with a credential query', () => {
    assert.strictEqual(decide(mixedRequest, vpWith(mockCredential)), false)
  })

  it('stores nothing when the exchange returns no credentials', () => {
    assert.strictEqual(decide(didAuthRequest), false)
    assert.strictEqual(decide(didAuthRequest, vpWith()), false)
    assert.strictEqual(
      shouldStoreExchangeCredentials({
        isVPRFlow: false,
        isDIDAuthOnly: false,
        receivedCredentials: []
      }),
      false
    )
    assert.strictEqual(
      shouldStoreExchangeCredentials({
        isVPRFlow: false,
        isDIDAuthOnly: false,
        receivedCredentials: undefined
      }),
      false
    )
  })
})
