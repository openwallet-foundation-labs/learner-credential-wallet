import 'react-native-gesture-handler';
import 'react-native-get-random-values';

import React from 'react';
import { Provider } from 'react-redux';
import { LogBox } from 'react-native';

import store from './app/store';
import { AppNavigation } from './app/navigation';
import { ThemeProvider } from './app/components';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
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
