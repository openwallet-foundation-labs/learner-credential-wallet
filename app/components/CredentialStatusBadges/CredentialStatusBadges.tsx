import React, { useCallback } from 'react';
import { View } from 'react-native';
import { CredentialStatusBadgesProps } from './CredentialStatusBadges.d';
import StatusBadge from '../StatusBadge/StatusBadge';
import dynamicStyleSheet from './CredentialStatusBadges.styles';
import { useAsyncCallback } from 'react-async-hook';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import { useFocusEffect } from '@react-navigation/native';
import { hasPublicLink } from '../../lib/publicLink';

export default function CredentialStatusBadges({
  rawCredentialRecord,
  badgeBackgroundColor,
}: CredentialStatusBadgesProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const checkPublicLink = useAsyncCallback<boolean>(hasPublicLink);
  const verifyCredential = useVerifyCredential(rawCredentialRecord);

  useFocusEffect(
    useCallback(() => {
      checkPublicLink.execute(rawCredentialRecord);
    }, [rawCredentialRecord])
  );

  const getVerificationBadge = () => {
    const logs = verifyCredential?.result?.log ?? [];
    const isLoading = verifyCredential?.loading;
    const isVerified = verifyCredential?.result?.verified;

    

    // Show "Verifying" while loading
    if (isLoading) {
      return (
        <StatusBadge
          backgroundColor={badgeBackgroundColor}
          color={theme.color.textSecondary}
          label="Verifying"
          icon="rotate-right"
        />
      );
    }
    
 

    
    // Treat empty log and null verification result as Not Verified
    if (logs.length === 0 && isVerified === null) {
      return (
        <StatusBadge
          backgroundColor={badgeBackgroundColor}
          color={theme.color.errorLight}
          label="Not Verified"
          icon="close"
        />
      );
    }
    

    //  Evaluate logs
    const details = logs.reduce<Record<string, boolean>>((acc, log) => {
      acc[log.id] = log.valid;
      return acc;
    }, {});

    // Add default values for expected checks if missing
    ['valid_signature', 'expiration', 'registered_issuer'].forEach(key => {
      if (!(key in details)) {
        details[key] = false;
      }
    });

    const hasFailure = ['valid_signature','revocation_status'].some(
      key => details[key] === false
    );

    const hasWarning = ['expiration', 'registered_issuer'].some(
      key => details[key] === false
    );


    if (hasFailure) {
      return (
        <StatusBadge
          backgroundColor={badgeBackgroundColor}
          color={theme.color.errorLight}
          label="Not Verified"
          icon="close"
        />
      );
    }

    if (hasWarning) {
      return (
        <StatusBadge
          backgroundColor={badgeBackgroundColor}
          color={theme.color.warning}
          label="Warning"
          icon="error-outline"
        />
      );
    }

    return (
      <StatusBadge
        backgroundColor={badgeBackgroundColor}
        color={theme.color.success}
        label="Verified"
        icon="check-circle"
      />
    );
  };

  const verifyBadge = getVerificationBadge();

  return (
    <View style={styles.container}>
      {verifyBadge}
      {checkPublicLink.result && (
        <StatusBadge
          label="Public"
          color={theme.color.textSecondary}
          backgroundColor={badgeBackgroundColor}
        />
      )}
    </View>
  );
}
