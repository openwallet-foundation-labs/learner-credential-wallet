import { getStateFromPath, LinkingOptions, NavigationState, PartialState } from '@react-navigation/native';
import { Linking } from 'react-native';
import qs from 'query-string';

import { navigationRef, RootNavigationParamsList } from '../navigation';
import { ChapiCredentialRequest } from '../types/chapi';
import { credentialRequestFromChapiUrl } from './decode';
import { encodeQueryParams } from './encode';
import { onShareIntent } from './shareIntent';

import { LinkConfig } from '../../app.config';
import { getChapiCredentialRequest } from './credentialRequest';

/**
 * In order to support OAuth redirects, the Android intent filter was set
 * specific to the scheme `dccrequest` and path `request`. If new paths are
 * added here, they must also be added to `android/app/src/main/AndroidManifest.xml`.
 */
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

function checkForSharingIntent(url: string): void {
  if (url.includes('ReceiveSharingIntent')) {
    onShareIntent();
  }
}

export const deepLinkConfig = deepLinkConfigFor({
  schemes: DEEP_LINK_SCHEMES,
  paths: DEEP_LINK_PATHS,
  onDeepLink: checkForSharingIntent,
});

/* =========== Start Deep Link Boilerplate ================ */

function transformDeepLink(url: string): string {
  return encodeQueryParams(url);
}

const redirectRequestRoute = (url: string) => {
  const request = credentialRequestFromChapiUrl(url);
  navigationRef.navigate('ExchangeCredentialsNavigation', {
    screen: 'ExchangeCredentials',
    params: { request }
  });
};

function deepLinkConfigFor({ schemes, paths, onDeepLink }: DeepLinkConfigOptions): LinkingOptions<RootNavigationParamsList> {
  return {
    prefixes: schemes,
    subscribe: (listener: (url: string) => void) => {
      const onReceiveURL = ({ url }: { url: string }) => {
        if (url.includes('request=')) {
          redirectRequestRoute(url);
        }
        onDeepLink?.(url);
        return listener(transformDeepLink(url));
      };

      const subscription = Linking.addEventListener('url', onReceiveURL);
      return () => subscription.remove();
    },
    getInitialURL: async () => {
      const url = await Linking.getInitialURL();
      if (url !== null) {
        await new Promise((res) => setTimeout(res, 100));
        onDeepLink?.(url);
        return transformDeepLink(url);
      }
    },
    getStateFromPath: (path) => {
      const { url, query } = qs.parseUrl(path);
      if (url.includes('ReceiveSharingIntent')) {
        return getStateFromPath(path);
      } else if ('request' in query) {
        const request = getChapiCredentialRequest(query);

        const stateForExchangeCredentials = (request: ChapiCredentialRequest) => deepLinkNavigate('ExchangeCredentialsNavigation', {
          screen: 'ExchangeCredentials',
          params: { request }
        });
        return stateForExchangeCredentials(request);
      }
      const state = paths[url](query);

      return state;
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeepLinkPaths = Record<string, (params: any) => any>;
type ResultState = PartialState<NavigationState>;
type DeepLinkConfigOptions = {
  schemes: Array<string>;
  paths: DeepLinkPaths;
  onDeepLink?: (url: string) => void;
}

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

/* =========== End Deep Link Boilerplate ================ */
