/**
 * Screen-level checks for ExchangeCredentials: what the user sees once the
 * exchange returns. processMessageChain and everything around the screen are
 * mocked; credentialsToOffer and exchangeCompletionMessage are real.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import ExchangeCredentials from '../app/screens/ExchangeCredentials/ExchangeCredentials'
import { processMessageChain, sendToExchanger } from '../app/lib/exchanges'
import { ExchangeFailedError } from '../app/lib/exchangeResult'
import { NavigationUtil } from '../app/lib/navigationUtil'
import { displayGlobalModal } from '../app/lib/globalModal'
import { navigationRef } from '../app/navigation/navigationRef'
import { stageCredentialsForProfile } from '../app/store/slices/credentialFoyer'
import { mockCredential } from '../app/mock/credential'

let confirmModalProps: any

jest.mock('../app/components', () => ({
  ConfirmModal: (props: any) => {
    confirmModalProps = props
    return null
  }
}))

jest.mock('react-native-elements', () => ({ Text: 'Text' }))

const mockDispatch = jest.fn(async () => undefined)
jest.mock('../app/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useDynamicStyles: () => ({ mixins: {} })
}))

jest.mock('../app/hooks/useThemeContext', () => ({
  useThemeContext: () => ({ theme: { color: {} } })
}))

jest.mock('../app/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => false),
    goBack: jest.fn()
  }
}))

jest.mock('../app/store/selectorFactories', () => ({
  selectWithFactory: () => ({ didDocument: {}, verificationKey: {} })
}))
jest.mock('../app/store/selectorFactories/makeSelectDidFromProfile', () => ({
  makeSelectDidFromProfile: jest.fn()
}))
jest.mock('../app/store/slices/credentialFoyer', () => ({
  stageCredentialsForProfile: jest.fn(() => ({ type: 'stage' }))
}))

jest.mock('../app/lib/exchanges', () => ({
  processMessageChain: jest.fn(),
  sendToExchanger: jest.fn()
}))

jest.mock('../app/lib/globalModal', () => ({
  displayGlobalModal: jest.fn(async () => true),
  clearGlobalModal: jest.fn()
}))
jest.mock('../app/lib/globalModalBody', () => ({
  getGlobalModalBody: (text: string) => text
}))

jest.mock('../app/lib/navigationUtil', () => ({
  NavigationUtil: {
    selectProfile: jest.fn(async () => ({ _id: 'profile-1', profileName: 'P' }))
  }
}))

jest.mock('../app/lib/time', () => ({
  delay: jest.fn(async () => undefined)
}))

jest.mock('../app/lib/profile', () => ({
  profileWithSigners: jest.fn(async () => ({}))
}))
jest.mock('../app/model', () => ({
  CredentialRecord: { getAllCredentialRecords: jest.fn() }
}))
jest.mock('../app/lib/getWasController', () => ({
  getWasController: jest.fn(async () => ({}))
}))

// ESM-only, pulled in transitively
jest.mock('@digitalcredentials/verifier-core', () => ({}))

const issued = { ...mockCredential, id: 'urn:uuid:newly-issued' } as any
const offer = {
  verifiablePresentation: {
    type: ['VerifiablePresentation'],
    verifiableCredential: [issued]
  }
}
const didAuthRequest = {
  verifiablePresentationRequest: {
    query: [{ type: 'DIDAuthentication' }],
    challenge: 'c',
    domain: 'issuer.example'
  }
}
const exchangeUrl = 'https://issuer.example/exchanges/1'
const invitation = { protocols: { vcapi: exchangeUrl } }
const deepLinkRequest = {
  ...didAuthRequest,
  redirectUrl: 'https://verifier.example/callback'
}

const isReady = navigationRef.isReady as jest.Mock
const navigate = navigationRef.navigate as jest.Mock
const showModal = displayGlobalModal as jest.Mock

async function acceptExchange(message: any) {
  render(
    <ExchangeCredentials
      route={{ params: { message } } as any}
      navigation={{} as any}
    />
  )
  await confirmModalProps.onConfirm()
}

const shownBodies = () => showModal.mock.calls.map(([options]) => options.body)

beforeEach(() => {
  jest.clearAllMocks()
  isReady.mockReturnValue(true)
})

describe('ExchangeCredentials', () => {
  it('opens the approval screen for a credential issued after DIDAuth', async () => {
    ;(processMessageChain as jest.Mock).mockResolvedValue({
      receivedCredentials: [issued],
      sent: { posted: true, credentials: [], didAuth: true, zcaps: false }
    })
    await acceptExchange(didAuthRequest)

    expect(stageCredentialsForProfile).toHaveBeenCalledWith({
      credentials: [issued],
      profileRecordId: 'profile-1'
    })
    expect(navigate).toHaveBeenCalledWith(
      'AcceptCredentialsNavigation',
      expect.anything()
    )
    expect(shownBodies()).not.toContain('DID Authentication complete.')
  })

  it('says the credentials were not saved if navigation is not ready', async () => {
    isReady.mockReturnValue(false)
    ;(processMessageChain as jest.Mock).mockResolvedValue({
      receivedCredentials: [issued]
    })
    await acceptExchange(offer)

    expect(shownBodies()).toEqual([
      "These credentials couldn't be shown and weren't saved. Ask the issuer to send them again."
    ])
    expect(stageCredentialsForProfile).not.toHaveBeenCalled()
  })

  it('shows the failure, never success, when the exchange endpoint fails', async () => {
    ;(sendToExchanger as jest.Mock).mockResolvedValue(didAuthRequest)
    ;(processMessageChain as jest.Mock).mockRejectedValue(
      new ExchangeFailedError('rejected', { status: 400 }).withSentBefore({
        posted: true,
        credentials: [],
        didAuth: true,
        zcaps: false
      })
    )
    await acceptExchange(invitation)

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Request Rejected',
        body: 'The request was rejected. Your DID Authentication response was sent before the error.'
      })
    )
    expect(shownBodies()).not.toContain('DID Authentication complete.')
    expect(navigate).toHaveBeenCalledWith('HomeNavigation', expect.anything())
    expect(stageCredentialsForProfile).not.toHaveBeenCalled()
  })

  it('reports an expired invitation from the initial POST', async () => {
    ;(sendToExchanger as jest.Mock).mockRejectedValue(
      new ExchangeFailedError('gone', { status: 404 })
    )
    await acceptExchange(invitation)

    expect(shownBodies()).toEqual([
      'This request has expired or no longer exists.'
    ])
    expect(NavigationUtil.selectProfile).not.toHaveBeenCalled()
  })

  it.each([null, 'ok', {}])(
    'says there is nothing to act on when the initial POST returns %p',
    async (body) => {
      ;(sendToExchanger as jest.Mock).mockResolvedValue(body)
      await acceptExchange(invitation)

      expect(showModal).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "This request didn't contain anything this wallet can act on."
        })
      )
      expect(navigate).toHaveBeenCalledWith('HomeNavigation', expect.anything())
      expect(NavigationUtil.selectProfile).not.toHaveBeenCalled()
      expect(processMessageChain).not.toHaveBeenCalled()
    }
  )

  it('checks status for an exchange invitation', async () => {
    ;(sendToExchanger as jest.Mock).mockResolvedValue(didAuthRequest)
    ;(processMessageChain as jest.Mock).mockResolvedValue({})
    await acceptExchange(invitation)

    expect(sendToExchanger).toHaveBeenCalledWith({
      exchangeUrl,
      payload: {},
      checkStatus: true
    })
    expect(processMessageChain).toHaveBeenCalledWith(
      expect.objectContaining({ exchangeUrl, checkStatus: true })
    )
  })

  it("does not check status for a deep-link request's redirectUrl", async () => {
    ;(processMessageChain as jest.Mock).mockResolvedValue({})
    await acceptExchange(deepLinkRequest)

    expect(sendToExchanger).not.toHaveBeenCalled()
    expect(processMessageChain).toHaveBeenCalledWith(
      expect.objectContaining({
        exchangeUrl: 'https://verifier.example/callback',
        checkStatus: false
      })
    )
  })

  it('confirms DID Authentication when nothing came back', async () => {
    ;(processMessageChain as jest.Mock).mockResolvedValue({
      receivedCredentials: [],
      sent: { posted: true, credentials: [], didAuth: true, zcaps: false }
    })
    await acceptExchange(didAuthRequest)

    expect(navigate).toHaveBeenCalledWith('HomeNavigation', expect.anything())
    expect(shownBodies()).toEqual(['DID Authentication complete.'])
  })
})
