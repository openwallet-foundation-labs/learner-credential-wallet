import { it, describe } from 'node:test'
import assert from 'node:assert'
import {
  credentialsToOffer,
  exchangeCompletionMessage,
  exchangerErrorDetail,
  ExchangeRejectedError,
  isExchangeRejectedError,
  isFollowUpStep,
  ISentSummary
} from '../app/lib/exchangeResult'
import { errorMessageFrom } from '../app/lib/error'
import { isDIDAuthOnlyRequest, queriesOf } from '../app/lib/walletRequestApi'
import { mockCredential } from '../app/mock/credential'

/**
 * credentialsToOffer and exchangeCompletionMessage are what
 * ExchangeCredentials calls with the result of processMessageChain. The
 * end-to-end wiring (processMessageChain reporting what it posted) is covered
 * by test/exchangeFlows.test.ts, and the screen by
 * test/ExchangeCredentials.test.tsx, under Jest.
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

const sentSummary = (fields: Partial<ISentSummary>): ISentSummary => ({
  posted: true,
  credentials: [],
  didAuth: false,
  zcaps: false,
  ...fields
})
const nothingPosted = sentSummary({ posted: false })
const sentDidAuth = sentSummary({ didAuth: true })
const sentDidAuthAndZcaps = sentSummary({ didAuth: true, zcaps: true })
const sentZcaps = sentSummary({ zcaps: true })
const shared = (...credentials: any[]) => sentSummary({ credentials })

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
        sent: sentDidAuth,
        receivedCredentials: [issued]
      }),
      [issued]
    )
  })

  it('offers what comes back after DIDAuth + ZcapQuery', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth, zcapQuery]),
        sent: sentDidAuthAndZcaps,
        receivedCredentials: [issued]
      }),
      [issued]
    )
  })

  it('offers what comes back after DIDAuth + a QBE with no match', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth, qbe]),
        sent: sentDidAuth,
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

  it('offers nothing when the exchanger asked for another step', () => {
    assert.deepStrictEqual(
      credentialsToOffer({
        answered: vpr([didAuth]),
        sent: sentDidAuth,
        nextStep: true,
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
          sent: sentDidAuth,
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
        sent: sentDidAuth,
        receivedCredentials: [issued]
      }),
      []
    )
  })
})

describe('exchangeCompletionMessage', () => {
  const body = (answered: any, sent?: ISentSummary, nextStep?: boolean) =>
    exchangeCompletionMessage({ answered, sent, nextStep })?.body

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
    assert.strictEqual(
      body(vpr([didAuth, qbe]), { ...shared(credentialA), didAuth: true }),
      'You have shared the selected credentials.'
    )
  })

  it('mentions storage access granted alongside shared credentials', () => {
    assert.strictEqual(
      body(vpr([qbe, zcapQuery]), { ...shared(credentialA), zcaps: true }),
      'You have shared the selected credentials and granted storage access.'
    )
  })

  it('confirms DID Authentication from what was sent', () => {
    assert.strictEqual(
      body(vpr([didAuth]), sentDidAuth),
      'DID Authentication complete.'
    )
    // The request asked for DIDAuth but nothing was posted: no claim
    assert.strictEqual(
      body(vpr([didAuth]), nothingPosted),
      'Nothing was shared.'
    )
  })

  it('mentions storage access granted alongside DID Authentication', () => {
    assert.strictEqual(
      body(vpr([didAuth, zcapQuery]), sentDidAuthAndZcaps),
      'DID Authentication complete. Storage access granted.'
    )
  })

  it('reports granted storage access for zcaps alone', () => {
    assert.strictEqual(
      body(vpr([zcapQuery]), sentZcaps),
      'Storage access granted.'
    )
  })

  it('does not claim success when nothing was posted', () => {
    assert.deepStrictEqual(
      exchangeCompletionMessage({ answered: vpr([qbe]), sent: nothingPosted }),
      { title: 'Nothing Shared', body: 'Nothing was shared.' }
    )
  })

  it('does not claim completion when another step is needed', () => {
    for (const sent of [sentDidAuth, shared(credentialA)]) {
      assert.deepStrictEqual(
        exchangeCompletionMessage({
          answered: vpr([didAuth]),
          sent,
          nextStep: true
        }),
        {
          title: 'Request Incomplete',
          body: "This request needs another step that this wallet doesn't support yet."
        }
      )
    }
  })

  it('says nothing for a message that is neither an offer nor a request', () => {
    assert.strictEqual(
      exchangeCompletionMessage({ answered: {} as any }),
      undefined
    )
  })
})

describe('isFollowUpStep', () => {
  it('detects a further presentation request or exchange invitation', () => {
    assert.strictEqual(isFollowUpStep(vpr([didAuth])), true)
    assert.strictEqual(
      isFollowUpStep({ protocols: { vcapi: 'https://x.example/2' } }),
      true
    )
  })

  it('does not treat a VP, an empty reply or no reply as another step', () => {
    assert.strictEqual(isFollowUpStep({ verifiablePresentation: {} }), false)
    assert.strictEqual(
      isFollowUpStep({ verifiablePresentation: {}, ...vpr([didAuth]) }),
      false
    )
    assert.strictEqual(isFollowUpStep({}), false)
    assert.strictEqual(
      isFollowUpStep({ redirectUrl: 'https://x.example' }),
      false
    )
    assert.strictEqual(isFollowUpStep(null), false)
  })
})

describe('exchange rejection', () => {
  it('reads name and message from an error body', () => {
    assert.strictEqual(
      exchangerErrorDetail(
        JSON.stringify({
          name: 'NotFoundError',
          message: 'Exchange not found.'
        })
      ),
      'NotFoundError: Exchange not found.'
    )
    assert.strictEqual(
      exchangerErrorDetail(
        JSON.stringify({
          error: { name: 'DataError', message: 'Invalid presentation.' }
        })
      ),
      'DataError: Invalid presentation.'
    )
    assert.strictEqual(
      exchangerErrorDetail(JSON.stringify({ error: 'Exchange expired.' })),
      'Exchange expired.'
    )
    assert.strictEqual(
      exchangerErrorDetail(
        JSON.stringify({ title: 'Bad Request', detail: 'Challenge mismatch.' })
      ),
      'Bad Request: Challenge mismatch.'
    )
  })

  it('ignores bodies with no usable detail', () => {
    for (const text of [undefined, '', '<html>502</html>', '{}', '[]', '"x"']) {
      assert.strictEqual(exchangerErrorDetail(text), undefined)
    }
  })

  it('truncates a long detail', () => {
    const detail = exchangerErrorDetail(
      JSON.stringify({ message: 'x'.repeat(500) })
    )
    assert.strictEqual(detail!.length, 200)
  })

  it('builds a user-facing message and is recognisable', () => {
    const withDetail = new ExchangeRejectedError(404, 'NotFoundError: Gone.')
    assert.strictEqual(
      withDetail.message,
      'The request was rejected. NotFoundError: Gone.'
    )
    assert.strictEqual(withDetail.status, 404)
    assert.strictEqual(isExchangeRejectedError(withDetail), true)
    assert.strictEqual(
      errorMessageFrom(withDetail),
      'The request was rejected. NotFoundError: Gone.'
    )
    assert.strictEqual(
      new ExchangeRejectedError(500).message,
      'The request was rejected.'
    )
    assert.strictEqual(isExchangeRejectedError(new Error('x')), false)
    assert.strictEqual(isExchangeRejectedError(undefined), false)
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
