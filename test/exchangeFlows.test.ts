/**
 * Drives processMessageChain through the exchange shapes from issue #957 and
 * feeds its result to credentialsToOffer and exchangeCompletionMessage, the
 * same calls ExchangeCredentials makes. Signing, credential selection, zcap
 * delegation and the network are mocked; query handling and what the wallet
 * reports as sent are real.
 */
import { processMessageChain, sendToExchanger } from '../app/lib/exchanges'
import {
  credentialsToOffer,
  exchangeCompletionMessage
} from '../app/lib/exchangeResult'
import { processZcaps } from '../app/lib/walletRequestApi'
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
  replyText,
  status = 200,
  networkError = false,
  bodyReadError,
  checkStatus = true,
  interactive
}: {
  answered: any
  walletCredentials?: any[]
  reply?: unknown
  // Raw body, overriding reply
  replyText?: string
  status?: number
  networkError?: boolean
  // Reading the body fails after the status arrived
  bodyReadError?: Error
  // true for a VC-API exchange endpoint, false for a deep link's redirectUrl
  checkStatus?: boolean
  interactive?: { grantZcaps: boolean }
}) {
  const fetchMock = jest.fn(async () => {
    if (networkError) throw new TypeError('Network request failed')
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => {
        if (bodyReadError) throw bodyReadError
        return replyText ?? JSON.stringify(reply)
      }
    }
  })
  global.fetch = fetchMock as any

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
      : { enabled: false },
    checkStatus
  })

  const calls = fetchMock.mock.calls as any[]
  return {
    sent: result.sent,
    payload: calls.length > 0 ? JSON.parse(calls[0][1].body) : undefined,
    toOffer: credentialsToOffer({ answered, ...result }),
    message: exchangeCompletionMessage({ answered, ...result })?.body
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
      interactive: { grantZcaps: false }
    })
    expect(result.payload).toBeUndefined()
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

  it('mentions storage access granted alongside DID Authentication', async () => {
    const result = await run({ answered: vpr([didAuth, zcapQuery]) })
    expect(result.sent).toEqual({
      posted: true,
      credentials: [],
      didAuth: true,
      zcaps: true
    })
    expect(result.message).toBe(
      'DID Authentication complete. Storage access granted.'
    )
  })

  it('mentions storage access granted alongside shared credentials', async () => {
    const result = await run({
      answered: vpr([qbe, zcapQuery]),
      walletCredentials: [credentialA]
    })
    expect(result.sent?.didAuth).toBe(false)
    expect(result.message).toBe(
      'You have shared the selected credentials and granted storage access.'
    )
  })

  it('does not claim completion when the exchanger asks for another step', async () => {
    const result = await run({
      answered: vpr([didAuth]),
      reply: vpr([qbe])
    })
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe(
      "This request needs another step that this wallet doesn't support yet."
    )
  })

  it('treats a null VP alongside a further request as another step', async () => {
    const result = await run({
      answered: vpr([didAuth]),
      reply: { verifiablePresentation: null, ...vpr([qbe]) }
    })
    expect(result.toOffer).toEqual([])
    expect(result.message).toBe(
      "This request needs another step that this wallet doesn't support yet."
    )
  })

  it('posts nothing when zcaps were requested but none could be made', async () => {
    ;(processZcaps as jest.Mock).mockResolvedValueOnce([])
    const result = await run({ answered: vpr([zcapQuery]) })
    expect(result.payload).toBeUndefined()
    expect(result.sent?.posted).toBe(false)
    expect(result.message).toBe('Nothing was shared.')
  })

  it('sends a VP without zcaps when DIDAuth was requested but no zcaps were made', async () => {
    ;(processZcaps as jest.Mock).mockResolvedValueOnce([])
    const result = await run({ answered: vpr([didAuth, zcapQuery]) })
    expect(result.payload.zcap).toBeUndefined()
    expect(result.sent?.zcaps).toBe(false)
    expect(result.message).toBe('DID Authentication complete.')
  })

  describe('a failed reply to a VC-API exchange endpoint', () => {
    const exchangerError = {
      name: 'DataError',
      message: 'Visit https://evil.example to verify your wallet.'
    }

    it.each([
      [400, 'The request was rejected.'],
      [403, 'The request was rejected.'],
      [404, 'This request has expired or no longer exists.'],
      [410, 'This request has expired or no longer exists.'],
      [500, 'The service had a problem with this request.'],
      [503, 'The service had a problem with this request.']
    ])(
      'HTTP %i reports the failure in wallet text only',
      async (status, base) => {
        const failure = run({
          answered: vpr([didAuth]),
          status,
          reply: exchangerError
        })
        await expect(failure).rejects.toMatchObject({
          isExchangeFailure: true,
          message: `${base} Your DID Authentication response was sent before the error.`
        })
        const error: any = await failure.catch((err) => err)
        expect(`${error.title} ${error.message}`).not.toMatch(
          /DataError|evil\.example|Try again/
        )
      }
    )

    it('mentions the credentials that were sent before the error', async () => {
      await expect(
        run({
          answered: vpr([qbe, zcapQuery]),
          walletCredentials: [credentialA],
          status: 400,
          replyText: ''
        })
      ).rejects.toMatchObject({
        message:
          'The request was rejected. Your selected credentials were sent and storage access was granted before the error.'
      })
    })

    it('says "may have" and attaches the cause when the network failed', async () => {
      const failure = run({
        answered: vpr([qbe]),
        walletCredentials: [credentialA],
        networkError: true
      })
      await expect(failure).rejects.toMatchObject({
        kind: 'unreachable',
        message:
          "The service couldn't be reached. Your selected credentials may have been sent before the error."
      })
      const error: any = await failure.catch((err) => err)
      expect(error.cause).toBeInstanceOf(TypeError)
    })

    it('classifies by status when the body cannot be read after a 404', async () => {
      const readError = new Error('stream reset')
      const failure = run({
        answered: vpr([didAuth]),
        status: 404,
        bodyReadError: readError
      })
      await expect(failure).rejects.toMatchObject({
        kind: 'gone',
        message:
          'This request has expired or no longer exists. Your DID Authentication response was sent before the error.'
      })
      const error: any = await failure.catch((err) => err)
      expect(error.cause).toBe(readError)
    })
  })

  describe('a successful status with no usable body', () => {
    it.each(['<html>OK</html>', 'not json', ''])(
      'treats %p as a reply with nothing further',
      async (replyText) => {
        const result = await run({ answered: vpr([didAuth]), replyText })
        expect(result.toOffer).toEqual([])
        expect(result.message).toBe('DID Authentication complete.')
      }
    )

    it('treats an unreadable body as a reply with nothing further', async () => {
      const result = await run({
        answered: vpr([didAuth]),
        bodyReadError: new Error('stream reset')
      })
      expect(result.message).toBe('DID Authentication complete.')
    })
  })

  describe('the initial POST {} to an exchange invitation', () => {
    it('suggests trying again when the service could not be reached', async () => {
      global.fetch = jest.fn(async () => {
        throw new TypeError('Network request failed')
      }) as any
      await expect(
        sendToExchanger({ exchangeUrl, payload: {}, checkStatus: true })
      ).rejects.toMatchObject({
        kind: 'unreachable',
        message: "The service couldn't be reached. Try again later."
      })
    })
  })

  describe("a deep-link request's redirectUrl (unchecked, as on main)", () => {
    it('does not treat a 404 with a JSON body as an error', async () => {
      const result = await run({
        answered: vpr([didAuth]),
        checkStatus: false,
        status: 404,
        reply: { name: 'NotFoundError', message: 'Not found.' }
      })
      expect(result.toOffer).toEqual([])
      expect(result.message).toBe('DID Authentication complete.')
    })

    it('does not treat a 404 with an empty body as an error', async () => {
      const result = await run({
        answered: vpr([qbe]),
        walletCredentials: [credentialA],
        checkStatus: false,
        status: 404,
        replyText: ''
      })
      expect(result.toOffer).toEqual([])
      expect(result.message).toBe('You have shared the selected credentials.')
    })

    it('rethrows a network error unchanged', async () => {
      await expect(
        run({
          answered: vpr([didAuth]),
          checkStatus: false,
          networkError: true
        })
      ).rejects.toThrow(TypeError)
    })
  })
})
