
import 'react-native-gesture-handler';
import 'react-native-get-random-values';

import 'react-native-url-polyfill/auto';
import './app/polyfills';

import React from 'react';
import { Provider } from 'react-redux';
import { LogBox } from 'react-native';

import store from './app/store';
import { AppNavigation } from './app/navigation';
import { ThemeProvider } from './app/components';

// DEV probe: confirm core globals for crypto + encoders are present
if (__DEV__) {
  // @ts-ignore
  const hasCrypto = typeof globalThis.crypto !== 'undefined';
  // @ts-ignore
  const hasGRV = !!globalThis.crypto?.getRandomValues;
  const hasBuffer = typeof globalThis.Buffer !== 'undefined';
  const hasTE = typeof globalThis.TextEncoder !== 'undefined';
  const hasTD = typeof globalThis.TextDecoder !== 'undefined';
  const hasURL = typeof globalThis.URL !== 'undefined';
  // @ts-ignore
  console.log('[env probe]', { hasCrypto, hasGRV, hasBuffer, hasTE, hasTD, hasURL });
}


LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Support for defaultProps will be removed from function components',
  'Support for defaultProps will be removed from function components in a future major release. Use Javascript default parameters instead',
]);

export default function App(): React.ReactElement | null {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppNavigation />
      </ThemeProvider>
    </Provider>
  );
}
