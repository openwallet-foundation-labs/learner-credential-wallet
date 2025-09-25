import React, { useMemo } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigation from '../RootNavigation/RootNavigation';
import SetupNavigation from '../SetupNavigation/SetupNavigation';
import { RestartScreen, LoginScreen } from '../../screens';
import { useAppLoading, useDynamicStyles } from '../../hooks';
import { selectWalletState } from '../../store/slices/wallet';
import { EventProvider } from 'react-native-outside-press';
import { deepLinkConfig } from '../../lib/deepLinkConfig';
import GlobalConfirmModal from '../../components/GlobalConfirmModal/GlobalConfirmModal';
import { navigationRef } from '../navigationRef';

export { navigationRef };

SplashScreen.preventAutoHideAsync();

export default function AppNavigation(): React.ReactElement | null {
  const { mixins, theme } = useDynamicStyles();

  const navigatorTheme = useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.color.backgroundPrimary,
    },
  }), [theme]);

  const loading = useAppLoading();
  const {
    isUnlocked,
    isInitialized,
    needsRestart,
  } = useSelector(selectWalletState);

  function renderScreen(): React.ReactElement | null {
    if (needsRestart) {
      return <RestartScreen />;
    } else if (isUnlocked && isInitialized) {
      return <RootNavigation />;
    } else if (!isUnlocked && isInitialized) {
      return <LoginScreen />;
    } else if (!isUnlocked && !isInitialized) {
      return <SetupNavigation />;
    } else {
      return null;
    }
  }

  if (loading) {
    return <GlobalConfirmModal />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.statusBarStyle} />
      <GlobalConfirmModal />
      <EventProvider style={mixins.flex}>
        <NavigationContainer
          onReady={SplashScreen.hideAsync}
          theme={navigatorTheme}
          ref={navigationRef}
          linking={deepLinkConfig}
        >
          {renderScreen()}
        </NavigationContainer>
      </EventProvider>
    </SafeAreaProvider>
  );
}
