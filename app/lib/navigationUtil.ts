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
 * Processes incoming deep link from:
 *  1) Linking 'subscribe' event (from a deep link opened by mobile OS)
 *  2) Pasting a deep link into the Add Credential textbox
 *  3) Scanning a deep link with QR Code reader on Add Credential screen
 */
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
