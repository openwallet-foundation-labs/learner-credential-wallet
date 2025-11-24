import { StackScreenProps } from '@react-navigation/stack';
import { ReactNode } from 'react';
import { DetailsScreenParams, PublicLinkScreenParams } from '../../screens';
import { ProfileCredentialScreenParams } from '../../screens/ProfileCredentialScreen/ProfileCredentialScreen.d';
import { CredentialRecordRaw } from '../../types/credential';

export type SettingsItemProps = {
  readonly title: string
  readonly onPress: () => void
  readonly rightComponent?: ReactNode
  readonly disabled?: boolean
}

export type SettingsNavigationParamList = {
  Settings: undefined;
  RestoreWalletScreen: undefined;
  About: undefined;
  ManageProfilesScreen: undefined;
  AddExistingProfileScreen: undefined;
  ProfileCredentialScreen: ProfileCredentialScreenParams;
  CredentialScreen: {
    rawCredentialRecord: CredentialRecordRaw;
    noShishKabob?: boolean;
  };
  PublicLinkScreen: PublicLinkScreenParams;
  DetailsScreen: DetailsScreenParams;
  DeveloperScreen: undefined;
  WASScreen: undefined;
  WasConnect: undefined;
};

export type SettingsProps = StackScreenProps<SettingsNavigationParamList, 'Settings'>;
export type RestoreWalletScreenProps = StackScreenProps<SettingsNavigationParamList, 'RestoreWalletScreen'>;
export type AboutProps = StackScreenProps<SettingsNavigationParamList, 'About'>;
export type ManageProfilesScreenProps = StackScreenProps<SettingsNavigationParamList, 'ManageProfilesScreen'>;
export type AddExistingProfileScreenProps = StackScreenProps<SettingsNavigationParamList, 'AddExistingProfileScreen'>;
export type CredentialScreenSettingsProps = StackScreenProps<SettingsNavigationParamList, 'CredentialScreen'>;
export type PublicLinkScreenSettingsProps = StackScreenProps<SettingsNavigationParamList, 'PublicLinkScreen'>;
export type DetailsScreenSettingsProps = StackScreenProps<SettingsNavigationParamList, 'DetailsScreen'>;
export type DeveloperScreenProps = StackScreenProps<SettingsNavigationParamList, 'DeveloperScreen'>;
