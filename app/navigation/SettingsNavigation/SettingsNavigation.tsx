import React, { useState } from 'react';
import { ScrollView, Image, Linking, AccessibilityInfo, Switch } from 'react-native';
import { Text, ListItem } from 'react-native-elements';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import DeviceInfo from 'react-native-device-info';
import { TouchableOpacity } from 'react-native-gesture-handler';

import appConfig, { LinkConfig, WAS } from '../../../app.config';
import walletImage from '../../assets/wallet.png';
import dynamicStyleSheet from './SettingsNavigation.styles';
import { NavHeader, ConfirmModal, BackupItemModal } from '../../components';
import { lock, reset, selectWalletState, toggleBiometrics } from '../../store/slices/wallet';
import {
  SettingsItemProps,
  SettingsProps,
  AboutProps,
  SettingsNavigationParamList,
} from './SettingsNavigation.d';
import { AddExistingProfileScreen, DetailsScreen, DeveloperScreen, ManageProfilesScreen, RestoreWalletScreen } from '../../screens';
import { useAppDispatch, useDynamicStyles, useResetNavigationOnBlur, useThemeContext } from '../../hooks';
import { SettingsNavigationProps } from '../';
import { exportWallet } from '../../lib/export';
import { registerWallet } from '../../lib/registerWallet';
import WASScreen from '../../screens/WAS/WasScreen';
import WasConnect from '../../screens/WAS/WasConnect';

const Stack = createStackNavigator<SettingsNavigationParamList>();

function SettingsItem({ title, onPress, rightComponent, disabled }: SettingsItemProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);

  const _rightComponent = rightComponent || (
    <ListItem.Chevron
      hasTVPreferredFocus={undefined}
      color={theme.color.textSecondary}
    />
  );

  return (
    <ListItem
      containerStyle={styles.listItemContainer}
      onPress={onPress}
      disabled={disabled}
      disabledStyle={styles.listItemContainerDisabled}
    >
      <ListItem.Content>
        <ListItem.Title style={styles.listItemTitle}>
          {title}
        </ListItem.Title>
      </ListItem.Content>
      {_rightComponent}
    </ListItem>
  );
}

function Settings({ navigation }: SettingsProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);

  const dispatch = useAppDispatch();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const { isBiometricsSupported } = useSelector(selectWalletState);
  const { isBiometricsEnabled: initialBiometryValue } = useSelector(selectWalletState);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(initialBiometryValue);
  const { isDarkTheme, toggleTheme } = useThemeContext();

  async function resetWallet() {
    dispatch(reset());
  }

  function lockWallet() {
    AccessibilityInfo.announceForAccessibility('Locked Wallet');
    dispatch(lock());
  }

  async function onToggleBiometrics() {
    const initialState = isBiometricsEnabled;
    setIsBiometricsEnabled(!initialState);

    try {
      await dispatch(toggleBiometrics());
    } catch (err) {
      setIsBiometricsEnabled(initialState);
      console.error('Could not toggle biometrics', err);
    }
  }

  const biometricSwitch = (
    <Switch
      style={styles.switch}
      thumbColor={isBiometricsEnabled ? theme.color.backgroundSecondary : theme.color.backgroundPrimary}
      trackColor={{ true: theme.color.switchActive, false: theme.color.iconInactive }}
      ios_backgroundColor={theme.color.iconInactive}
      value={isBiometricsEnabled}
      onValueChange={onToggleBiometrics}
      disabled={!isBiometricsSupported}
    />
  );

  const themeSwitch = (
    <Switch
      style={styles.switch}
      thumbColor={isDarkTheme ? theme.color.backgroundSecondary : theme.color.backgroundPrimary}
      trackColor={{ true: theme.color.switchActive, false: theme.color.iconInactive }}
      ios_backgroundColor={theme.color.iconInactive}
      value={isDarkTheme}
      onValueChange={toggleTheme}
    />
  );

  return (
    <>
      <NavHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.settingsContainer}>
        <SettingsItem title="Use biometrics to unlock" onPress={onToggleBiometrics} rightComponent={biometricSwitch} disabled={!isBiometricsSupported} />
        <SettingsItem title="Dark mode" onPress={toggleTheme} rightComponent={themeSwitch} />
        <SettingsItem title="Manage profiles" onPress={() => navigation.navigate('ManageProfilesScreen')} />
        <SettingsItem title="Register wallet" onPress={registerWallet} />
        <SettingsItem title="Restore wallet" onPress={() => navigation.navigate('RestoreWalletScreen')} />
        <SettingsItem title="Backup wallet" onPress={() => setBackupModalOpen(true)} />
        <SettingsItem title="Reset wallet" onPress={() => setResetModalOpen(true)} />
        <SettingsItem title="About" onPress={() => navigation.navigate('About')} />
        <SettingsItem title="Sign out" onPress={lockWallet} />
      </ScrollView>
      <ConfirmModal
        open={resetModalOpen}
        onRequestClose={() => setResetModalOpen(false)}
        onConfirm={resetWallet}
        confirmText="Yes"
        title="Are you sure you would like to reset your wallet?"
      />
      <BackupItemModal
        open={backupModalOpen}
        onRequestClose={() => setBackupModalOpen(false)}
        onBackup={exportWallet}
        backupItemName="Wallet"
        backupModalText="This will backup your wallet contents into a file for you to download."
      />
    </>
  );
}

function About({ navigation }: AboutProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const version = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  function goToDeveloperScreen() {
    navigation.navigate('DeveloperScreen');
  }

  return (
    <>
      <NavHeader goBack={() => navigation.navigate('Settings')} title="About" />
      <ScrollView contentContainerStyle={styles.bodyContainerCenter}>
        <Image
          style={styles.image}
          source={walletImage}
          accessible
          accessibilityLabel={`${appConfig.displayName} Logo`}
        />
        <Text style={styles.aboutTitleBolded}>{appConfig.displayName}</Text>
        <Text style={styles.paragraphCenter}>
          This mobile wallet was developed by the Digital Credentials Consortium, a network of leading international universities designing an open infrastructure for academic credentials.
        </Text>
        <Text style={styles.paragraphCenter} accessibilityRole="link" >
          More information at&nbsp;
          <Text
            style={styles.link}
            onPress={() => Linking.openURL(LinkConfig.appWebsite.home)}
          >
            {LinkConfig.appWebsite.home}
          </Text>.
        </Text>
        <Text style={styles.paragraphCenter}>
          Copyright 2021-2025 Massachusetts Institute of Technology
        </Text>
        <TouchableOpacity onPress={goToDeveloperScreen}>
          <Text style={styles.paragraphCenter}>
            v{version} - Build {buildNumber}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

export default function SettingsNavigation({ navigation }: SettingsNavigationProps): React.ReactElement {
  useResetNavigationOnBlur(navigation);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Settings"
    >
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="ManageProfilesScreen" component={ManageProfilesScreen} />
      <Stack.Screen name="AddExistingProfileScreen" component={AddExistingProfileScreen} />
      <Stack.Screen name="DetailsScreen" component={DetailsScreen} />
      <Stack.Screen name="RestoreWalletScreen" component={RestoreWalletScreen} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="DeveloperScreen" component={DeveloperScreen} />
      {WAS.enabled && (
        <>
          <Stack.Screen name="WASScreen" component={WASScreen} />
          <Stack.Screen name="WasConnect" component={WasConnect} />
        </>
      )}
    </Stack.Navigator>
  );
}
