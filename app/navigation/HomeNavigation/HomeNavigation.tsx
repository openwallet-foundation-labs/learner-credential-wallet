import React from 'react';
import { Platform } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import dynamicStyleSheet from './HomeNavigation.styles';
import {
  CredentialNavigation,
  ShareNavigation,
  SettingsNavigation,
  HomeNavigationParamList,
  TabIconProps,
  AddNavigation,
} from '../../navigation';
import { useDynamicStyles } from '../../hooks';
import { VERIFIER_PLUS_URL } from '../../../app.config';

const Tab = createBottomTabNavigator<HomeNavigationParamList>();

const labelSuffix = Platform.OS === 'ios' ? ', tab' : '';

export default function HomeNavigation(): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  
  // Check if VERIFIER_PLUS_URL is configured for sharing functionality
  const isVerifierConfigured = VERIFIER_PLUS_URL && VERIFIER_PLUS_URL.trim().length > 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        unmountOnBlur: true,
        tabBarStyle: styles.barStyle,
        tabBarActiveTintColor: theme.color.iconActive,
        tabBarInactiveTintColor: theme.color.iconInactive,
      }}
    >
      <Tab.Screen name="CredentialNavigation" component={CredentialNavigation} options={{
        title: 'My Wallet',
        tabBarIcon: HomeTabIcon,
        tabBarAccessibilityLabel: isVerifierConfigured ? `My Wallet, (1 of 4)${labelSuffix}` : `My Wallet, (1 of 3)${labelSuffix}`,
      }}/>
      {isVerifierConfigured && (
        <Tab.Screen name="ShareNavigation" component={ShareNavigation} options={{
          title: 'Share',
          tabBarIcon: ShareTabIcon,
          tabBarAccessibilityLabel: `Share, (2 of 4)${labelSuffix}`,
        }}/>
      )}
      <Tab.Screen name="AddNavigation" component={AddNavigation} options={{
        title: 'Add',
        tabBarIcon: AddTabIcon,
        tabBarAccessibilityLabel: isVerifierConfigured ? `Add, (3 of 4)${labelSuffix}` : `Add, (2 of 3)${labelSuffix}`,
      }}/>
      <Tab.Screen name="SettingsNavigation" component={SettingsNavigation} options={{
        title: 'Settings',
        tabBarIcon: SettingsTabIcon,
        tabBarAccessibilityLabel: isVerifierConfigured ? `Settings, (4 of 4)${labelSuffix}` : `Settings, (3 of 3)${labelSuffix}`,
      }}/>
    </Tab.Navigator>
  );
}

const HomeTabIcon = ({ color }: TabIconProps) => {
  const { theme } = useDynamicStyles();
  return <MaterialIcons name="home" color={color} size={theme.iconSize} />;
};

const ShareTabIcon = ({ color }: TabIconProps) => {
  const { theme } = useDynamicStyles();
  return <MaterialIcons name="share" color={color} size={theme.iconSize} />;
};

const AddTabIcon = ({ color }: TabIconProps) => {
  const { theme } = useDynamicStyles();
  return <MaterialIcons name="add-circle" color={color} size={theme.iconSize} />;
};

const SettingsTabIcon = ({ color }: TabIconProps) => {
  const { theme } = useDynamicStyles();
  return <MaterialIcons name="settings" color={color} size={theme.iconSize} />;
};
