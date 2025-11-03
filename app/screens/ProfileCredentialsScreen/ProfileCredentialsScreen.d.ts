import { StackScreenProps } from '@react-navigation/stack';
import { SettingsNavigationParamList } from '../../navigation/SettingsNavigation/SettingsNavigation.d';
import { ProfileRecordRaw } from '../../model';

export type ProfileCredentialsScreenProps = StackScreenProps<
  SettingsNavigationParamList,
  'ProfileCredentialsScreen'
>;

export type ProfileCredentialsScreenParams = {
  rawProfileRecord: ProfileRecordRaw;
};