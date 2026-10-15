import { it, describe } from 'node:test'
import assert from 'node:assert'
import {
  credentialsToOffer,
  exchangeCompletionMessage
} from '../app/lib/exchangeResult'
import { mockCredential } from '../app/mock/credential'

/**
 * credentialsToOffer and exchangeCompletionMessage are what
 * ExchangeCredentials calls with the result of processMessageChain. The
 * end-to-end wiring (processMessageChain reporting what it sent) is covered
 * by test/exchangeFlows.test.ts under Jest.
 */

const holderDid = 'did:key:z6MkHolder'

// mockCredential has no top-level id, so it can only match by content
const sharedNoId = mockCredential as any
const shared = { ...mockCredential, id: 'urn:uuid:shared' } as any
const issued = {
  ...mockCredential,
  id: 'urn:uuid:newly-issued',
  credentialSubject: {
    ...(mockCredential as any).credentialSubject,
    id: holderDid
  }
} as any

const didAuthOnly = {
  verifiablePresentationRequest: {
    query: [{ type: 'DIDAuthentication' }],
    challenge: 'c',
    domain: 'issuer.example'
  }
} as any

const queryByExample = {
  verifiablePresentationRequest: {
    query: [
      {
        type: 'QueryByExample',
        credentialQuery: { example: { type: 'VerifiableCredential' } }
      }
    ],
    challenge: 'c',
    domain: 'verifier.example'
  }
} as any

const didAuthPlusQbe = {
  verifiablePresentationRequest: {
    query: [
      { type: 'DIDAuthentication' },
      {
        type: 'QueryByExample',
        credentialQuery: { example: { type: 'VerifiableCredential' } }
      }
    ],
    challenge: 'c',
    domain: 'verifier.example'
  }
} as any

describe('credentialsToOffer', () => {
  it('offers every credential in an offer (the wallet sent nothing)', () => {
    assert.deepStrictEqual(
      credentialsToOffer({ receivedCredentials: [shared, issued] }),
      [shared, issued]
    )
  })

  it('offers a credential issued after a DIDAuth-only request', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [],
        receivedCredentials: [issued]
      }),
      [issued]
    )
  })

  it('offers nothing when a verifier echoes exactly what was shared', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [shared, sharedNoId],
        receivedCredentials: [shared, sharedNoId]
      }),
      []
    )
  })

  it('offers only the new credential when an echo and a new one come back', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [shared],
        receivedCredentials: [shared, issued]
      }),
      [issued]
    )
  })

  it('matches by id when both credentials have one, ignoring content', () => {
    const reissuedSameId = { ...shared, issuanceDate: '2026-01-01T00:00:00Z' }
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [shared],
        receivedCredentials: [reissuedSameId]
      }),
      []
    )
  })

  it('does not match equal content when both ids differ', () => {
    const sameContentOtherId = { ...shared, id: 'urn:uuid:other' }
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [shared],
        receivedCredentials: [sameContentOtherId]
      }),
      [sameContentOtherId]
    )
  })

  it('matches by content when an id is missing, regardless of key order', () => {
    const reordered = Object.fromEntries(
      Object.entries(sharedNoId).reverse()
    ) as any
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [sharedNoId],
        receivedCredentials: [reordered]
      }),
      []
    )
  })

  it('treats different content without ids as new', () => {
    const changed = {
      ...sharedNoId,
      issuanceDate: '2026-01-01T00:00:00Z'
    }
    assert.deepStrictEqual(
      credentialsToOffer({
        sentCredentials: [sharedNoId],
        receivedCredentials: [changed]
      }),
      [changed]
    )
  })

  it('offers nothing when nothing came back', () => {
    assert.deepStrictEqual(credentialsToOffer({ receivedCredentials: [] }), [])
    assert.deepStrictEqual(
      credentialsToOffer({ receivedCredentials: undefined }),
      []
    )
    assert.deepStrictEqual(
      credentialsToOffer({ receivedCredentials: null }),
      []
    )
  })
})

describe('exchangeCompletionMessage', () => {
  it('says an empty offer had no credentials', () => {
    assert.deepStrictEqual(
      exchangeCompletionMessage({
        answered: {
          verifiablePresentation: { type: 'VerifiablePresentation' }
        } as any
      }),
      {
        title: 'No Credentials',
        body: "This offer didn't include any credentials."
      }
    )
  })

  it('confirms sharing when the wallet sent credentials', () => {
    assert.strictEqual(
      exchangeCompletionMessage({
        answered: queryByExample,
        sentCredentials: [shared]
      })?.body,
      'You have shared the selected credentials.'
    )
  })

  it('confirms DID Authentication after a DIDAuth-only request', () => {
    assert.strictEqual(
      exchangeCompletionMessage({ answered: didAuthOnly, sentCredentials: [] })
        ?.body,
      'DID Authentication complete.'
    )
  })

  it('confirms DID Authentication when a DIDAuth + QBE request shared nothing', () => {
    assert.strictEqual(
      exchangeCompletionMessage({
        answered: didAuthPlusQbe,
        sentCredentials: []
      })?.body,
      'DID Authentication complete.'
    )
  })

  it('does not claim credentials were shared when none were', () => {
    assert.strictEqual(
      exchangeCompletionMessage({
        answered: queryByExample,
        sentCredentials: []
      })?.body,
      'Request complete.'
    )
  })

  it('says nothing for a message that is neither an offer nor a request', () => {
    assert.strictEqual(
      exchangeCompletionMessage({ answered: {} as any }),
      undefined
    )
  })
})
