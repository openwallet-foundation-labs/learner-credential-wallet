/**
 * Drives processMessageChain through the exchange shapes from issue #957 and
 * feeds its result to credentialsToOffer and exchangeCompletionMessage, the
 * same calls ExchangeCredentials makes. Signing, credential selection, zcap
 * delegation and the network are mocked; query handling and what the wallet
 * reports as sent are real.
 */
import { processMessageChain } from '../app/lib/exchanges'
import {
  credentialsToOffer,
  exchangeCompletionMessage
} from '../app/lib/exchangeResult'
import { selectCredentials } from '../app/lib/selectCredentials'
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

const credentialA = { ...mockCredential, id: 'urn:uuid:a' } as any
const credentialB = { ...mockCredential, id: 'urn:uuid:b' } as any
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

const originalFetch = global.fetch
afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

/**
 * Runs one exchange step the way ExchangeCredentials does and returns what
 * the screen would act on, plus the payload the wallet posted (if any).
 */
async function run({
  answered,
  walletCredentials = [],
  reply = {},
  interactive
}: {
  answered: any
  walletCredentials?: any[]
  reply?: unknown
  interactive?: { selected: any[]; grantZcaps: boolean }
}) {
  const fetchMock = jest.fn(async () => ({
    text: async () => JSON.stringify(reply)
  }))
  global.fetch = fetchMock as any
  if (interactive) {
    ;(selectCredentials as jest.Mock).mockResolvedValue(
      interactive.selected.map((credential) => ({ credential }))
    )
  }

  const result = await processMessageChain({
    exchangeUrl,
    requestOrOffer: answered,
    selectedProfile: {
      loadCredentials: async () =>
        walletCredentials.map((credential) => ({ credential }))
    } as any,
    wasController: {} as any,
    modals: interactive
      ? {
          enabled: true,
          confirmZcapRequest: async () => interactive.grantZcaps
        }
      : { enabled: false }
  })

  const calls = fetchMock.mock.calls as any[]
  return {
    sent: result.sent,
    payload: calls.length > 0 ? JSON.parse(calls[0][1].body) : undefined,
    toOffer: credentialsToOffer({ answered, ...result }),
    message: exchangeCompletionMessage({ answered, sent: result.sent })?.body
  }
}

describe('exchange flows (issue #957)', () => {
  it('offers the credentials in an offer', async () => {
    const result = await run({
      answered: { verifiablePresentation: vpWith(issued) }
    })
    expect(result.toOffer).toEqual([issued])
  })

  it('says so when an offer has no credentials', async () => {
    const result = await run({ answered: { verifiablePresentation: vpWith() } })
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe("This offer didn't include any credentials.")
  })

  it('offers a credential issued after a DIDAuth-only request', async () => {
    const result = await run({
      answered: vpr([didAuth]),
      walletCredentials: [credentialA],
      reply: { verifiablePresentation: vpWith(issued) }
    })
    expect(result.payload.verifiablePresentation.verifiableCredential).toBe(
      undefined
    )
    expect(result.toOffer).toEqual([issued])
  })

  it('offers a credential issued after a DIDAuth + ZcapQuery request', async () => {
    const result = await run({
      answered: vpr([didAuth, zcapQuery]),
      reply: { verifiablePresentation: vpWith(issued) }
    })
    expect(result.payload.zcap).toEqual([{ id: 'urn:zcap:granted' }])
    expect(result.toOffer).toEqual([issued])
  })

  it('offers a credential issued after DIDAuth + a QBE with no match', async () => {
    const result = await run({
      answered: vpr([didAuth, qbe]),
      walletCredentials: [],
      reply: { verifiablePresentation: vpWith(issued) }
    })
    expect(result.sent?.credentials).toEqual([])
    expect(result.toOffer).toEqual([issued])
  })

  it('offers nothing when the wallet shared A and the verifier returned B', async () => {
    const result = await run({
      answered: vpr([qbe]),
      walletCredentials: [credentialA],
      reply: { verifiablePresentation: vpWith(credentialB) }
    })
    expect(result.payload.verifiablePresentation.verifiableCredential).toEqual([
      credentialA
    ])
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe('You have shared the selected credentials.')
  })

  it('offers nothing when a verifier echoes the shared VP', async () => {
    const result = await run({
      answered: vpr([didAuth, qbe]),
      walletCredentials: [credentialA],
      reply: { verifiablePresentation: vpWith(credentialA) }
    })
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe('You have shared the selected credentials.')
  })

  it('says nothing was shared when no credential matched and nothing was posted', async () => {
    const result = await run({
      answered: vpr([qbe]),
      walletCredentials: []
    })
    expect(result.payload).toBeUndefined()
    expect(result.sent?.posted).toBe(false)
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe('Nothing was shared.')
  })

  it('says nothing was shared when zcap consent was declined', async () => {
    const result = await run({
      answered: vpr([zcapQuery]),
      interactive: { selected: [], grantZcaps: false }
    })
    expect(result.payload).toBeUndefined()
    expect(result.message).toBe('Nothing was shared.')
  })

  it('says nothing was shared when the user deselected every credential', async () => {
    const result = await run({
      answered: vpr([qbe]),
      walletCredentials: [credentialA],
      interactive: { selected: [], grantZcaps: true }
    })
    expect(result.payload).toEqual({})
    expect(result.message).toBe('Nothing was shared.')
  })

  it('reports granted storage access for a zcap-only request', async () => {
    const result = await run({ answered: vpr([zcapQuery]) })
    expect(result.payload.zcap).toEqual([{ id: 'urn:zcap:granted' }])
    expect(result.message).toBe('Storage access granted.')
  })

  it('offers nothing when the exchanger replies without a VP', async () => {
    const result = await run({ answered: vpr([didAuth]) })
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe('DID Authentication complete.')
  })
})
