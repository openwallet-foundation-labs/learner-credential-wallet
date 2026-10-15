import { it, describe } from 'node:test'
import assert from 'node:assert'
import {
  credentialsToOffer,
  exchangeCompletionMessage,
  ISentSummary
} from '../app/lib/exchangeResult'
import { isDIDAuthOnlyRequest, queriesOf } from '../app/lib/walletRequestApi'
import { mockCredential } from '../app/mock/credential'

/**
 * credentialsToOffer and exchangeCompletionMessage are what
 * ExchangeCredentials calls with the result of processMessageChain. The
 * end-to-end wiring (processMessageChain reporting what it posted) is covered
 * by test/exchangeFlows.test.ts under Jest.
 */

const credentialA = { ...mockCredential, id: 'urn:uuid:a' } as any
const credentialB = { ...mockCredential, id: 'urn:uuid:b' } as any
const issued = { ...mockCredential, id: 'urn:uuid:newly-issued' } as any

const vpr = (query: unknown) =>
  ({
    verifiablePresentationRequest: {
      query,
      challenge: 'c',
      domain: 'exchanger.example'
    }
  }) as any

const didAuth = { type: 'DIDAuthentication' }
const qbe = {
  type: 'QueryByExample',
  credentialQuery: { example: { type: ['Assertion'] } }
}
const zcapQuery = { type: 'ZcapQuery', capabilityQuery: {} }

const nothingPosted: ISentSummary = {
  posted: false,
  credentials: [],
  zcaps: false
}
const postedNoCredentials: ISentSummary = {
  posted: true,
  credentials: [],
  zcaps: false
}
const postedZcaps: ISentSummary = { posted: true, credentials: [], zcaps: true }
const shared = (...credentials: any[]): ISentSummary => ({
  posted: true,
  credentials,
  zcaps: false
})

describe('credentialsToOffer', () => {
  it('offers everything in an offer', () => {
    const answered = { verifiablePresentation: {} } as any
    assert.deepStrictEqual(
      credentialsToOffer({ answered, receivedCredentials: [issued] }),
      [issued]
    )
  })

  it('offers what comes back after DIDAuth-only', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth]),
        sent: postedNoCredentials,
        receivedCredentials: [issued]
      }),
      [issued]
    )
  })

  it('offers what comes back after DIDAuth + ZcapQuery', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth, zcapQuery]),
        sent: postedZcaps,
        receivedCredentials: [issued]
      }),
      [issued]
    )
  })

  it('offers what comes back after DIDAuth + a QBE with no match', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth, qbe]),
        sent: postedNoCredentials,
        receivedCredentials: [issued]
      }),
      [issued]
    )
  })

  it('offers nothing after sharing A, even when B comes back', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([qbe]),
        sent: shared(credentialA),
        receivedCredentials: [credentialB]
      }),
      []
    )
  })

  it('offers nothing after sharing, when the shared VP is echoed', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth, qbe]),
        sent: shared(credentialA),
        receivedCredentials: [credentialA]
      }),
      []
    )
  })

  it('offers nothing when the wallet posted no reply', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([qbe]),
        sent: nothingPosted,
        receivedCredentials: [issued]
      }),
      []
    )
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth]),
        receivedCredentials: [issued]
      }),
      []
    )
  })

  it('offers nothing when nothing came back', () => {
    for (const receivedCredentials of [[], undefined, null]) {
      assert.deepStrictEqual(
        credentialsToOffer({
          answered: vpr([didAuth]),
          sent: postedNoCredentials,
          receivedCredentials
        }),
        []
      )
    }
  })

  it('offers nothing for a message that is neither an offer nor a request', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: {} as any,
        sent: postedNoCredentials,
        receivedCredentials: [issued]
      }),
      []
    )
  })
})

describe('exchangeCompletionMessage', () => {
  const body = (answered: any, sent?: ISentSummary) =>
    exchangeCompletionMessage({ answered, sent })?.body

  it('says an empty offer had no credentials', () => {
    assert.deepStrictEqual(
      exchangeCompletionMessage({
        answered: { verifiablePresentation: {} } as any
      }),
      {
        title: 'No Credentials',
        body: "This offer didn't include any credentials."
      }
    )
  })

  it('confirms sharing when credentials were shared', () => {
    assert.strictEqual(
      body(vpr([qbe]), shared(credentialA)),
      'You have shared the selected credentials.'
    )
  })

  it('confirms DID Authentication when a DIDAuth VP was posted', () => {
    assert.strictEqual(
      body(vpr([didAuth]), postedNoCredentials),
      'DID Authentication complete.'
    )
    assert.strictEqual(
      body(vpr([didAuth, qbe]), postedNoCredentials),
      'DID Authentication complete.'
    )
  })

  it('reports granted storage access for zcaps alone', () => {
    assert.strictEqual(
      body(vpr([zcapQuery]), postedZcaps),
      'Storage access granted.'
    )
  })

  it('does not claim success when nothing was posted', () => {
    assert.deepStrictEqual(
      exchangeCompletionMessage({ answered: vpr([qbe]), sent: nothingPosted }),
      { title: 'Nothing Shared', body: 'Nothing was shared.' }
    )
  })

  it('does not claim success when an empty reply was posted', () => {
    assert.strictEqual(
      body(vpr([qbe]), postedNoCredentials),
      'Nothing was shared.'
    )
  })

  it('says nothing for a message that is neither an offer nor a request', () => {
    assert.strictEqual(
      exchangeCompletionMessage({ answered: {} as any }),
      undefined
    )
  })
})

describe('queriesOf', () => {
  it('wraps a single query in an array', () => {
    assert.deepStrictEqual(queriesOf({ query: didAuth as any }), [didAuth])
  })

  it('returns an array query as is, dropping non-object entries', () => {
    assert.deepStrictEqual(queriesOf({ query: [didAuth, null, qbe] as any }), [
      didAuth,
      qbe
    ])
  })

  it('returns no queries for a missing query or request', () => {
    assert.deepStrictEqual(queriesOf({}), [])
    assert.deepStrictEqual(queriesOf(undefined), [])
  })

  it('lets isDIDAuthOnlyRequest handle a missing query without throwing', () => {
    assert.strictEqual(isDIDAuthOnlyRequest(vpr(undefined)), false)
    assert.strictEqual(isDIDAuthOnlyRequest(vpr(didAuth)), true)
    assert.strictEqual(isDIDAuthOnlyRequest(vpr([didAuth, zcapQuery])), false)
  })
})
