import React, { useLayoutEffect, useState, useRef } from 'react'
import { Text } from 'react-native-elements'
import { AppState } from 'react-native'
import { ConfirmModal } from '../../components'
import { useAppDispatch, useDynamicStyles } from '../../hooks'
import { navigationRef } from '../../navigation/navigationRef'
import { selectWithFactory } from '../../store/selectorFactories'
import { makeSelectDidFromProfile } from '../../store/selectorFactories/makeSelectDidFromProfile'
import { stageCredentialsForProfile } from '../../store/slices/credentialFoyer'
import { processMessageChain, sendToExchanger } from '../../lib/exchanges'
import { displayGlobalModal, clearGlobalModal } from '../../lib/globalModal'
import GlobalModalBody, { getGlobalModalBody } from '../../lib/globalModalBody'
import { NavigationUtil } from '../../lib/navigationUtil'
import { delay } from '../../lib/time'
import { ExchangeCredentialsProps } from './ExchangeCredentials.d'
import { HumanReadableError } from '../../lib/error'
import { useThemeContext } from '../../hooks/useThemeContext'

import { profileWithSigners } from '../../lib/profile'
import { CredentialRecord } from '../../model'

export default function ExchangeCredentials({
  route
}: ExchangeCredentialsProps): React.ReactElement {
  const { params } = route
  const { message } = params

  const { theme } = useThemeContext()
  const dispatch = useAppDispatch()
  const { mixins } = useDynamicStyles()

  const [coldStart, setColdStart] = useState(true)
  const appState = useRef(AppState.currentState)

  useLayoutEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      //use AppState to determine if app is cold launched or not
      if (appState.current === null || nextAppState === 'background') {
        //if cold launch, auto-open the modal
        setColdStart(true)
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const dataLoadingSuccessModalState = {
    title: 'Success',
    confirmButton: true,
    confirmText: 'OK',
    cancelButton: false,
    body: (
      <GlobalModalBody message="You have successfully delivered credentials to the organization." />
    )
  }

  const confirmZcapRequest = async () => {
    const confirmed = await displayGlobalModal({
      title: 'Storage Access Request',
      confirmText: 'Grant',
      cancelOnBackgroundPress: true,
      body: (
        <Text style={{ color: theme.color.textPrimary }}>
          Something is requesting storage access.
        </Text>
      )
    })
    return confirmed
  }

  /**
   * Called when user confirms Yes to the 'Incoming Message' modal below.
   * Param (from above):
   * - message {WalletApiMessage} - an offer or a request, see below
   *
   * Example offer shape:
   * { verifiablePresentation }
   *
   * Example request shapes:
   * { credentialRequestOrigin, protocols }
   * { verifiablePresentationRequest: { query } }
   * { issueRequest: { credential } }
   */
  const acceptExchange = async () => {
    setColdStart(false)
    // Short circuit unsupported IssueRequest
    if ('issueRequest' in message) {
      throw new HumanReadableError('Issue/signing requests not supported yet.')
    }

    console.log(
      '[acceptExchange] Processing message:',
      JSON.stringify(message, null, 2)
    )

    const { credentialRequestOrigin } = message
    console.log(
      '[acceptExchange] credentialRequestOrigin (self-asserted):',
      credentialRequestOrigin
    )

    let requestOrOffer, exchangeUrl
    // If this is an Exchange Invitation, send the initial POST {}
    //   to get back either a request or an offer
    if ('protocols' in message) {
      exchangeUrl = message.protocols?.vcapi
      if (exchangeUrl === undefined) {
        throw new HumanReadableError(
          'Only the "vcapi" protocol is supported currently.'
        )
      }
      // Start the exchange - initial POST {}
      const initialResponse = await await sendToExchanger({
        exchangeUrl,
        payload: {}
      })
      console.log(
        `Initial exchange response from "${exchangeUrl}":`,
        JSON.stringify(initialResponse, null, 2)
      )
      requestOrOffer = initialResponse
    } else {
      exchangeUrl = message.redirectUrl
      requestOrOffer = message
    }

    // Regardless if request is an offer or a request, select profile
    const isVPRFlow = 'verifiablePresentationRequest' in requestOrOffer
    const rawProfileRecord = await NavigationUtil.selectProfile(
      isVPRFlow
        ? {
            goBack: () => {
              displayGlobalModal({
                title: 'Cancel Send',
                confirmButton: false,
                cancelButton: false,
                body: getGlobalModalBody(
                  'Ending credential request. To send credentials, open another request.',
                  true
                )
              })
              navigationRef.navigate('HomeNavigation', {
                screen: 'CredentialNavigation',
                params: { screen: 'HomeScreen' }
              })
              setTimeout(clearGlobalModal, 10000)
            }
          }
        : undefined
    )
    const selectedDidRecord = selectWithFactory(makeSelectDidFromProfile, {
      rawProfileRecord
    })
    const selectedProfile = await profileWithSigners({
      profileName: rawProfileRecord.profileName,
      loadCredentials: CredentialRecord.getAllCredentialRecords,
      didRecord: {
        didDocument: selectedDidRecord.didDocument,
        verificationKey: selectedDidRecord.verificationKey
      }
    })

    // Recursively process exchanges until either:
    //  1) we're issued some credentials, or
    //  2) the exchange ends (we've sent off all requested items)
    // TODO: Open the 'redirectUrl' if present?
    const modals = { enabled: true, confirmZcapRequest }
    const { acceptCredentials } = await processMessageChain(
      { exchangeUrl, requestOrOffer, selectedProfile, modals })

    // We've been issued some credentials - present to user for accepting
    if (acceptCredentials && navigationRef.isReady()) {
      const { credentialRequestOrigin } = requestOrOffer
      console.log('credentialRequestOrigin:', credentialRequestOrigin)
      console.log('[acceptExchange] Accepting credentials:', acceptCredentials)
      await dispatch(
        stageCredentialsForProfile({
          credentials: acceptCredentials,
          profileRecordId: rawProfileRecord._id
        })
      )
      await delay(500)
      navigationRef.navigate('AcceptCredentialsNavigation', {
        screen: 'ApproveCredentialsScreen',
        params: {
          rawProfileRecord
        }
      })
    } else {
      console.log('[acceptExchange] Exchanges completed.')
      displayGlobalModal(dataLoadingSuccessModalState)
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'HomeScreen'
        }
      })
    }
  }

  const rejectExchange = () => {
    coldStart && setColdStart(false)
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack()
    } else {
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'HomeScreen'
        }
      })
    }
  }

  return (
    <ConfirmModal
      open={coldStart}
      onConfirm={acceptExchange}
      onCancel={rejectExchange}
      onRequestClose={() => {
        !coldStart && rejectExchange()
      }}
      title="Incoming Message"
      confirmText="Yes"
      cancelText="No"
    >
      <Text style={mixins.modalBodyText}>
        An organization would like to exchange credentials with you.
      </Text>
      <Text style={mixins.modalBodyText}>Would you like to continue?</Text>
    </ConfirmModal>
  )
}
