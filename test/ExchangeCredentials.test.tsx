/**
 * Screen-level checks for ExchangeCredentials: what the user sees once the
 * exchange returns. processMessageChain and everything around the screen are
 * mocked; credentialsToOffer and exchangeCompletionMessage are real.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import ExchangeCredentials from '../app/screens/ExchangeCredentials/ExchangeCredentials'
import { processMessageChain } from '../app/lib/exchanges'
import { ExchangeRejectedError } from '../app/lib/exchangeResult'
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

// Resolve waits immediately; waitFor polls a few times like the real one
jest.mock('../app/lib/time', () => ({
  delay: jest.fn(async () => undefined),
  waitFor: jest.fn(async (condition: () => boolean) => {
    for (let i = 0; i < 3; i++) if (condition()) return true
    return false
  })
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

  it('waits for navigation to become ready before opening the approval screen', async () => {
    isReady
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(true)
    ;(processMessageChain as jest.Mock).mockResolvedValue({
      receivedCredentials: [issued]
    })
    await acceptExchange(offer)

    expect(navigate).toHaveBeenCalledWith(
      'AcceptCredentialsNavigation',
      expect.anything()
    )
  })

  it('reports a failure, not an empty offer, when navigation never becomes ready', async () => {
    isReady.mockReturnValue(false)
    ;(processMessageChain as jest.Mock).mockResolvedValue({
      receivedCredentials: [issued]
    })
    await acceptExchange(offer)

    expect(shownBodies()).toEqual([
      "Couldn't open the approval screen. Please try again."
    ])
    expect(shownBodies()).not.toContain(
      "This offer didn't include any credentials."
    )
    expect(stageCredentialsForProfile).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows the rejection, never success, when the exchanger rejects the reply', async () => {
    ;(processMessageChain as jest.Mock).mockRejectedValue(
      new ExchangeRejectedError(400, 'DataError: Invalid presentation.')
    )
    await acceptExchange(didAuthRequest)

    expect(showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Request Rejected',
        body: 'The request was rejected. DataError: Invalid presentation.'
      })
    )
    expect(shownBodies()).not.toContain('DID Authentication complete.')
    expect(stageCredentialsForProfile).not.toHaveBeenCalled()
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
