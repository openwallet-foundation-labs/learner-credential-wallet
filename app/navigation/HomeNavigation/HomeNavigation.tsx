import React from 'react';
import { Platform } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import dynamicStyleSheet from './HomeNavigation.styles';
import CredentialNavigation from '../CredentialNavigation/CredentialNavigation';
import ShareNavigation from '../ShareNavigation/ShareNavigation';
import SettingsNavigation from '../SettingsNavigation/SettingsNavigation';
import type { HomeNavigationParamList, TabIconProps } from './HomeNavigation.d';
import AddNavigation from '../AddNavigation/AddNavigation';
import { useDynamicStyles } from '../../hooks';

const Tab = createBottomTabNavigator<HomeNavigationParamList>();

const labelSuffix = Platform.OS === 'ios' ? ', tab' : '';

export default function HomeNavigation(): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);

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
        tabBarAccessibilityLabel: `My Wallet, (1 of 4)${labelSuffix}`,
      }}/>
      <Tab.Screen name="ShareNavigation" component={ShareNavigation} options={{
        title: 'Share',
        tabBarIcon: ShareTabIcon,
        tabBarAccessibilityLabel: `Share, (2 of 4)${labelSuffix}`,
      }}/>
      <Tab.Screen name="AddNavigation" component={AddNavigation} options={{
        title: 'Add',
        tabBarIcon: AddTabIcon,
        tabBarAccessibilityLabel: `Add, (3 of 4)${labelSuffix}`,
      }}/>
      <Tab.Screen name="SettingsNavigation" component={SettingsNavigation} options={{
        title: 'Settings',
        tabBarIcon: SettingsTabIcon,
        tabBarAccessibilityLabel: `Settings, (4 of 4)${labelSuffix}`,
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
