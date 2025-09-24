import { NavigationState, PartialState } from '@react-navigation/native';
import { Linking } from 'react-native';

import { navigationRef } from '../navigation/navigationRef';
import { encodeQueryParams } from './encode';

import { LinkConfig } from '../../app.config';
import { parseWalletApiMessage, parseWalletApiUrl, WalletApiMessage } from './walletRequestApi';
import { redirectRequestRoute } from './navigationUtil';

const DEEP_LINK_SCHEMES = LinkConfig.schemes.customProtocol
  .concat(LinkConfig.schemes.universalAppLink);
const DEEP_LINK_PATHS: DeepLinkPaths = {
  request: (credentialRequestParams) => deepLinkNavigate('ProfileSelectionScreen', {
    onSelectProfile: (rawProfileRecord) => navigationRef.navigate('AcceptCredentialsNavigation', {
      screen: 'ApproveCredentialsScreen',
      params: {
        rawProfileRecord,
        credentialRequestParams,
      }
    }),
  }),
  present: (shareRequestParams) => deepLinkNavigate('HomeNavigation', {
    screen: 'ShareNavigation',
    params: {
      screen: 'ShareHomeScreen',
      params: {
        shareRequestParams,
      }
    }
  })
};

/**
 * @see https://reactnavigation.org/docs/navigation-container/#linking
 */
export const deepLinkConfig = {
  prefixes: DEEP_LINK_SCHEMES,
  /**
   * Gets called when user activates a deep link from the outside,
   * while app is running in background.
   *
   * @see https://reactnavigation.org/docs/navigation-container/?config=static#linkingsubscribe
   * @param listener
   */
  subscribe: (listener: (url: string) => void) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log('deepLink "subscribe" event for url:', url);
      if (url.includes('request=')) {
        redirectRequestRoute(url);
      }
      return listener(encodeQueryParams(url));
    };

    const subscription = Linking.addEventListener('url', onReceiveURL);
    return () => subscription.remove();
  },
  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    if (url !== null) {
      await new Promise((res) => setTimeout(res, 100));
      return encodeQueryParams(url);
    }
  },
  // getStateFromPath: (url: string) => {
  //   console.log('deepLink "getStateFromPath" event for path:', url);
  //   const messageObject = parseWalletApiUrl({ url });
  //   if (messageObject === undefined) {
  //     console.log('[redirectRequestRoute] No wallet api message found in url.');
  //     return;
  //   }
  //   const message = parseWalletApiMessage({ messageObject });
  //   if (message === undefined) {
  //     console.log('[redirectRequestRoute] Wallet api message not recognized.');
  //     return;
  //   }
  //   const stateForExchangeCredentials =
  //     (message: WalletApiMessage) => deepLinkNavigate('ExchangeCredentialsNavigation', {
  //       screen: 'ExchangeCredentials',
  //       params: { message }
  //     });
  //   return stateForExchangeCredentials(message);
  // }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeepLinkPaths = Record<string, (params: any) => any>;
type ResultState = PartialState<NavigationState>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepLinkNavigate: typeof navigationRef.navigate = (...args: any[]): ResultState => {
  function stateFor(screen: string, params?: Record<string, unknown>): ResultState {
    const hasParams = params !== undefined;
    const paramsAreNestedScreen = params !== undefined && 'screen' in params && 'params' in params;

    if (paramsAreNestedScreen) return { routes: [{ name: screen, state: stateFor(params?.screen as string, params?.params as Record<string, unknown>) }] };
    else if (hasParams) return { routes: [{ name: screen, params }] };
    return { routes: [{ name: screen }] };
  }

  return stateFor(args[0] as string, args[1] as Record<string, unknown>);
};
