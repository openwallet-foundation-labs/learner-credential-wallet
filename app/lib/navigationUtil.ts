import { CredentialRecordRaw, ProfileRecordRaw } from '../model'
import { navigationRef } from '../navigation/navigationRef'
import {
  CredentialSelectionScreenParams,
  ProfileSelectionScreenParams,
  QRScreenParams
} from '../screens'
import store from '../store'
import { selectRawProfileRecords } from '../store/slices/profile'
import { parseWalletApiMessage, parseWalletApiUrl } from './walletRequestApi'
import {
  parseInteractionUrl,
  fetchInteractionProtocols
} from './interactionUrl'
import type { IExchangeInvitation } from './walletRequestApi'
import { HumanReadableError } from './error'

export class NavigationUtil {
  static selectProfile(
    screenParams?: Omit<ProfileSelectionScreenParams, 'onSelectProfile'>
  ): Promise<ProfileRecordRaw> | ProfileRecordRaw {
    const rawProfileRecords = selectRawProfileRecords(store.getState())
    if (rawProfileRecords.length === 1) {
      return rawProfileRecords[0]
    }

    return new Promise((resolve) =>
      navigationRef.navigate('ProfileSelectionScreen', {
        onSelectProfile: resolve,
        ...screenParams
      })
    )
  }

  static selectCredentials(
    screenParams: Omit<CredentialSelectionScreenParams, 'onSelectCredentials'>
  ): Promise<CredentialRecordRaw[]> {
    return new Promise((resolve) =>
      navigationRef.navigate('CredentialSelectionScreen', {
        onSelectCredentials: resolve,
        ...screenParams
      })
    )
  }

  static scanQRCode(
    screenParams: Omit<QRScreenParams, 'onReadQRCode'>
  ): Promise<string> {
    return new Promise((resolve) =>
      navigationRef.navigate('QRScreen', {
        onReadQRCode: resolve,
        ...screenParams
      })
    )
  }
}

/**
 *  Processes incoming deep link from:
 *  1) Linking 'subscribe' event (from a deep link opened by mobile OS)
 *  2) Pasting a deep link into the Add Credential textbox
 *  3) Scanning a deep link with QR Code reader on Add Credential screen
 *
 * Fetches a VCALM interaction URL, resolves the vcapi protocol, and
 * navigates to ExchangeCredentials with the resulting invitation.
 */
export async function redirectInteractionUrl(url: string) {
  try {
    const interactionUrl = parseInteractionUrl(url)
    const protocols = await fetchInteractionProtocols(interactionUrl)

    if (!protocols.vcapi) {
      console.log(
        '[redirectInteractionUrl] Available protocols:',
        Object.keys(protocols)
      )
      throw new HumanReadableError(
        'No supported protocol found in the interaction response. Only "vcapi" is currently supported.'
      )
    }

    const message: IExchangeInvitation = {
      protocols: { vcapi: protocols.vcapi }
    }

    navigationRef.navigate('ExchangeCredentialsNavigation', {
      screen: 'ExchangeCredentials',
      params: { message }
    })
  } catch (err) {
    if (err instanceof HumanReadableError) {
      throw err
    }
    console.error('[redirectInteractionUrl] Error:', err)
    throw new HumanReadableError(
      'Failed to process interaction URL. Please try again.'
    )
  }
}

export function redirectRequestRoute(url: string) {
  const messageObject = parseWalletApiUrl({ url })
  if (messageObject === undefined) {
    console.log('[redirectRequestRoute] No wallet api message found in url.')
    return
  }
  const message = parseWalletApiMessage({ messageObject })
  if (message === undefined) {
    console.log('[redirectRequestRoute] Wallet api message not recognized.')
    return
  }
  navigationRef.navigate('ExchangeCredentialsNavigation', {
    screen: 'ExchangeCredentials',
    params: { message }
  })
}
