/**
 * Drives processMessageChain through the exchange shapes from issue #957 and
 * feeds its result to credentialsToOffer, the same call ExchangeCredentials
 * makes. Signing, credential selection, zcap delegation and the network are
 * mocked; the query handling and what the wallet reports as sent are real.
 */
import { processMessageChain } from '../app/lib/exchanges'
import { credentialsToOffer } from '../app/lib/exchangeResult'
import { mockCredential } from '../app/mock/credential'

// ESM-only and unused on this path
jest.mock('@digitalcredentials/verifier-core', () => ({}))

jest.mock('../app/lib/selectCredentials', () => ({
  selectCredentials: jest.fn()
}))

jest.mock('../app/lib/composeVp', () => ({
  composeVp: jest.fn(async ({ selectedVcs = [] }) => ({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: 'did:key:z6MkHolder',
    ...(selectedVcs.length > 0 ? { verifiableCredential: selectedVcs } : {})
  }))
}))

jest.mock('../app/lib/walletRequestApi', () => ({
  ...jest.requireActual('../app/lib/walletRequestApi'),
  processZcaps: jest.fn(async () => [{ id: 'urn:zcap:granted' }])
}))

const exchangeUrl = 'https://exchanger.example/exchanges/123'

const stored = { ...mockCredential, id: 'urn:uuid:stored' } as any
const issued = {
  ...mockCredential,
  id: 'urn:uuid:newly-issued',
  credentialSubject: {
    ...(mockCredential as any).credentialSubject,
    id: 'did:key:z6MkHolder'
  }
} as any

const vpWith = (...credentials: unknown[]) => ({
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  type: ['VerifiablePresentation'],
  verifiableCredential: credentials
})

const vpr = (query: unknown[]) => ({
  verifiablePresentationRequest: {
    query,
    challenge: 'c0ae1c8e-c7e7-469f-b252-86e6a0e7387e',
    domain: 'exchanger.example'
  }
})

const didAuth = { type: 'DIDAuthentication' }
const qbe = {
  type: 'QueryByExample',
  credentialQuery: { example: { type: ['Assertion'] } }
}
const zcapQuery = {
  type: 'ZcapQuery',
  capabilityQuery: {
    reason: 'Store your credentials',
    allowedAction: ['GET', 'PUT'],
    controller: 'did:key:z6MkIssuer',
    invocationTarget: { type: 'urn:was:collection' }
  }
}

let fetchMock: jest.Mock

function exchangerReplies(reply: unknown) {
  fetchMock = jest.fn(async () => ({ text: async () => JSON.stringify(reply) }))
  global.fetch = fetchMock as any
}

function sentPayload() {
  return JSON.parse(fetchMock.mock.calls[0][1].body)
}

async function run(requestOrOffer: any, walletCredentials: any[] = []) {
  const result = await processMessageChain({
    exchangeUrl,
    requestOrOffer,
    selectedProfile: {
      loadCredentials: async () =>
        walletCredentials.map((credential) => ({ credential }))
    } as any,
    wasController: {} as any,
    modals: { enabled: false }
  })
  return { ...result, toOffer: credentialsToOffer(result) }
}

describe('exchange flows (issue #957)', () => {
  it('offers the credentials in an offer', async () => {
    const result = await run({ verifiablePresentation: vpWith(issued) })
    expect(result.sentCredentials).toBeUndefined()
    expect(result.toOffer).toEqual([issued])
  })

  it('offers nothing for an empty offer', async () => {
    const result = await run({ verifiablePresentation: vpWith() })
    expect(result.toOffer).toEqual([])
  })

  it('offers a credential issued after a DIDAuth-only request', async () => {
    exchangerReplies({ verifiablePresentation: vpWith(issued) })
    const result = await run(vpr([didAuth]), [stored])
    expect(sentPayload().verifiablePresentation.verifiableCredential).toBe(
      undefined
    )
    expect(result.sentCredentials).toEqual([])
    expect(result.toOffer).toEqual([issued])
  })

  it('offers a credential issued after a DIDAuth + ZcapQuery request', async () => {
    exchangerReplies({ verifiablePresentation: vpWith(issued) })
    const result = await run(vpr([didAuth, zcapQuery]))
    expect(sentPayload().zcap).toEqual([{ id: 'urn:zcap:granted' }])
    expect(result.sentCredentials).toEqual([])
    expect(result.toOffer).toEqual([issued])
  })

  it('offers a credential issued after DIDAuth + QBE when nothing matched', async () => {
    exchangerReplies({ verifiablePresentation: vpWith(issued) })
    const result = await run(vpr([didAuth, qbe]), [])
    expect(result.sentCredentials).toEqual([])
    expect(result.toOffer).toEqual([issued])
  })

  it('offers nothing when a verifier echoes the shared VP', async () => {
    exchangerReplies({ verifiablePresentation: vpWith(stored) })
    const result = await run(vpr([qbe]), [stored])
    expect(sentPayload().verifiablePresentation.verifiableCredential).toEqual([
      stored
    ])
    expect(result.sentCredentials).toEqual([stored])
    expect(result.toOffer).toEqual([])
  })

  it('offers only the new credential when an echo and a new one come back', async () => {
    exchangerReplies({ verifiablePresentation: vpWith(stored, issued) })
    const result = await run(vpr([didAuth, qbe]), [stored])
    expect(result.sentCredentials).toEqual([stored])
    expect(result.toOffer).toEqual([issued])
  })

  it('offers nothing when the exchanger replies without a VP', async () => {
    exchangerReplies({})
    const result = await run(vpr([didAuth]))
    expect(result.toOffer).toEqual([])
  })
})
