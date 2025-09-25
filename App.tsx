import 'react-native-gesture-handler';
import 'react-native-get-random-values';

import React from 'react';
import { Provider } from 'react-redux';
import { LogBox } from 'react-native';

import store from './app/store';
import AppNavigation from './app/navigation/AppNavigation/AppNavigation';
import ThemeProvider from './app/components/ThemeProvider/ThemeProvider';

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
