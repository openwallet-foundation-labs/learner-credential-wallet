import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { CredentialStatusBadgesProps } from './CredentialStatusBadges.d';
import StatusBadge from '../StatusBadge/StatusBadge';
import dynamicStyleSheet from './CredentialStatusBadges.styles';
import { useAsyncCallback } from 'react-async-hook';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import { useFocusEffect } from '@react-navigation/native';
import { hasPublicLink } from '../../lib/publicLink';

function CredentialStatusBadges({
  rawCredentialRecord,
  badgeBackgroundColor,
  precomputedVerification,
  precomputedPublic,
}: CredentialStatusBadgesProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const checkPublicLink = useAsyncCallback<boolean>(hasPublicLink);
  const stablePublicRef = useRef<boolean | undefined>(undefined);
  const currentCredentialIdRef = useRef<string | null>(null);
  const verifyCredential = precomputedVerification
    ? { loading: false, error: null, result: precomputedVerification }
    : useVerifyCredential(rawCredentialRecord);

  // Get credential ID for comparison
  const credentialId = (rawCredentialRecord as any)?._id?.toHexString?.() ?? (rawCredentialRecord as any)?._id;

  // Reset stable ref when credential changes to prevent stale data when component is reused
  useEffect(() => {
    if (currentCredentialIdRef.current !== credentialId) {
      currentCredentialIdRef.current = credentialId;
      stablePublicRef.current = undefined;
    }
  }, [credentialId]);

  useFocusEffect(
    useCallback(() => {
      if (precomputedPublic === undefined) {
        checkPublicLink.execute(rawCredentialRecord);
      }
    }, [rawCredentialRecord, precomputedPublic])
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

  const verifyBadge = useMemo(() => getVerificationBadge(), [verifyCredential?.result?.verified, verifyCredential?.loading, verifyCredential?.result?.log]);

  // Stabilize the Public badge to avoid flash when component re-renders quickly
  // Keep first resolved value until credential changes to avoid flicker during parent re-renders
  useEffect(() => {
    const incoming = precomputedPublic ?? checkPublicLink.result;
    if (stablePublicRef.current === undefined && incoming !== undefined) {
      stablePublicRef.current = !!incoming;
    }
  }, [precomputedPublic, checkPublicLink.result]);

  return (
    <View style={styles.container}>
      {verifyBadge}
      {(stablePublicRef.current ?? precomputedPublic ?? checkPublicLink.result) && (
        <StatusBadge
          label="Public"
          color={theme.color.textSecondary}
          backgroundColor={badgeBackgroundColor}
        />
      )}
    </View>
  );
}

export default React.memo(CredentialStatusBadges, (prev, next) => {
  try {
    const prevId = (prev.rawCredentialRecord as any)?._id;
    const nextId = (next.rawCredentialRecord as any)?._id;
    const sameRecord = typeof prevId?.equals === 'function' ? prevId.equals(nextId) : prevId === nextId;
    return sameRecord && prev.badgeBackgroundColor === next.badgeBackgroundColor;
  } catch {
    return false;
  }
});
