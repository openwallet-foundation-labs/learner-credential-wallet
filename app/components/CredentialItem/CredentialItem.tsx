import React, { ComponentProps, useMemo } from 'react';
import { View } from 'react-native';
import { ListItem, CheckBox } from 'react-native-elements';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import dynamicStyleSheet from './CredentialItem.styles';
import type { CredentialItemProps } from './CredentialItem.d';
import { CredentialStatusBadges } from '../../components';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import { credentialItemPropsFor } from '../../lib/credentialDisplay';
import { CardImage } from '../../lib/credentialDisplay/shared';

type VerificationStatus = 'verifying' | 'verified' | 'warning' | 'not_verified';

export default function CredentialItem({
  onSelect,
  checkable = false,
  selected = false,
  chevron = false,
  hideLeft = false,
  bottomElement,
  rawCredentialRecord,
  credential,
  showStatusBadges = false,
}: CredentialItemProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet);
  const verifyCredential = useVerifyCredential(rawCredentialRecord);

  const { title, subtitle, image: rawImage } = credentialItemPropsFor(credential);

  const image = typeof rawImage === 'string' ? { uri: rawImage } : rawImage;

  const hasBottomElement = bottomElement !== undefined;
  const accessibilityProps: ComponentProps<typeof View> = {
    accessibilityLabel: `${title} Credential, from ${subtitle}`,
    accessibilityRole: checkable ? 'checkbox' : 'button',
    accessibilityState: { checked: checkable ? selected : undefined },
  };

  const verificationStatus = useMemo<VerificationStatus>(() => {
    const logs = verifyCredential?.result?.log ?? [];
    const isLoading = verifyCredential?.loading;
    const isVerified = verifyCredential?.result?.verified;

    if (logs.length === 0 && isVerified === null) return 'not_verified';
    if (isLoading && logs.length > 0) return 'verifying';

    const details = logs.reduce<Record<string, boolean>>((acc, log) => {
      acc[log.id] = log.valid;
      return acc;
    }, {});

    ['valid_signature', 'expiration', 'registered_issuer'].forEach((key) => {
      if (!(key in details)) {
        details[key] = false;
      }
    });

    const hasFailure = ['valid_signature', 'revocation_status'].some(
      (key) => details[key] === false
    );

    const hasWarning = ['expiration', 'registered_issuer'].some(
      (key) => details[key] === false
    );

    if (hasFailure) return 'not_verified';
    if (hasWarning) return 'warning';

    return 'verified';
  }, [verifyCredential]);

  function LeftContent(): React.ReactElement | null {
    if (hideLeft) return null;
  
    if (checkable) {
      return (
        <CheckBox
          checked={selected}
          onPress={onSelect}
          checkedColor={theme.color.buttonPrimary}
          containerStyle={mixins.checkboxContainer}
          textStyle={mixins.checkboxText}
        />
      );
    }
  
    const hasImage = image?.uri?.startsWith('http');
  
    if (hasImage) {
      return (
        <CardImage
          source={image?.uri || null}
          accessibilityLabel={subtitle}
          size={theme.issuerIconSize - 8}
        />
      );
    }
  

    if (verificationStatus === 'not_verified') {
      return (
        <View style={styles.notVerifiedIcon}>
          <MaterialCommunityIcons
            name="close-circle"
            size={theme.issuerIconSize - 8}
            color={theme.color.error}
          />
        </View>
      );
    }
  
    if (verificationStatus === 'warning') {
      return (
        <View style={styles.notVerifiedIcon}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={theme.issuerIconSize - 8}
            color={theme.color.warning}
          />
        </View>
      );
    }
  
    if (verificationStatus === 'verifying') {
      return (
        <View style={styles.notVerifiedIcon}>
          <MaterialCommunityIcons
            name="progress-clock"
            size={theme.issuerIconSize - 8}
            color={theme.color.textSecondary}
          />
        </View>
      );
    }
  
    return (
      <View style={styles.notVerifiedIcon}>
        <MaterialCommunityIcons
          name="check-circle"
          size={theme.issuerIconSize - 8}
          color={theme.color.success}
        />
      </View>
    );
  }
  
  
  function StatusBadges(): React.ReactElement | null {
    if (!showStatusBadges || !rawCredentialRecord) return null;

    return (
      <CredentialStatusBadges
        rawCredentialRecord={rawCredentialRecord}
        badgeBackgroundColor={theme.color.backgroundPrimary}
      />
    );
  }

  function Chevron(): React.ReactElement | null {
    if (!chevron) return null;

    return (
      <ListItem.Chevron
        hasTVPreferredFocus={undefined}
        color={theme.color.textSecondary}
      />
    );
  }

  return (
    <ListItem
      hasTVPreferredFocus={undefined}
      containerStyle={styles.listItemContainer}
      style={styles.listItemOuterContainer}
      onPress={onSelect}
      accessible={!hasBottomElement}
      importantForAccessibility={hasBottomElement ? 'no' : 'yes'}
      {...accessibilityProps}
    >
      <ListItem.Content style={styles.listItemContentContainer}>
        <View
          style={styles.listItemTopContent}
          accessible={hasBottomElement}
          importantForAccessibility={hasBottomElement ? 'yes' : 'no-hide-descendants'}
          {...accessibilityProps}
        >
          <LeftContent />
          <View style={styles.listItemTextContainer}>
            <StatusBadges />
            <ListItem.Title style={styles.listItemTitle}>{title}</ListItem.Title>
            <ListItem.Subtitle style={styles.listItemSubtitle}>{subtitle}</ListItem.Subtitle>
          </View>
          <Chevron />
        </View>
        {bottomElement}
      </ListItem.Content>
    </ListItem>
  );
}
