import type { StackScreenProps } from '@react-navigation/stack';
import { ShareRequestParams } from '../../lib/shareRequest';

import type { CredentialRecordRaw } from '../../model/credential';
import { PublicLinkScreenParams } from '../../screens';

export type ShareNavigationParamsList = {
  ShareHomeScreen: {
    shareRequestParams: ShareRequestParams
  } | undefined;
  PresentationPreviewScreen: {
    selectedCredentials: CredentialRecordRaw[];
    mode?: 'send' | 'createLink';
  };
  CredentialScreen: {
    rawCredentialRecord: CredentialRecordRaw;
    noShishKabob?: boolean;
  };
  PublicLinkScreen: PublicLinkScreenParams
};

export type ShareHomeScreenProps = StackScreenProps<ShareNavigationParamsList, 'ShareHomeScreen'>;
export type PresentationPreviewScreenProps = StackScreenProps<ShareNavigationParamsList, 'PresentationPreviewScreen'>;
export type CredentialScreenShareProps = StackScreenProps<ShareNavigationParamsList, 'CredentialScreen'>;
export type PublicLinkScreenShareProps = StackScreenProps<ShareNavigationParamsList, 'PublicLinkScreen'>;
