import React from 'react';
import { View, FlatList, Linking, Platform, InteractionManager } from 'react-native';
import { Button, Text } from 'react-native-elements';

import { CredentialItem, NavHeader, LoadingIndicatorDots } from '../../components';
import dynamicStyleSheet from './PresentationPreviewScreen.styles';
import type { PresentationPreviewScreenProps } from '../../navigation';
import type { RenderItemProps } from './PresentationPreviewScreen.d';
import { useDynamicStyles } from '../../hooks';
import { useShareCredentials } from '../../hooks/useShareCredentials';
import { PublicLinkScreenMode } from '../PublicLinkScreen/PublicLinkScreen';
import { displayGlobalModal, clearGlobalModal } from '../../lib/globalModal';
import { createPublicLinkFor, getPublicViewLink } from '../../lib/publicLink';
import { LinkConfig } from '../../../app.config';

export default function PresentationPreviewScreen({
  navigation,
  route,
}: PresentationPreviewScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet);
  const { selectedCredentials, mode = 'send' } = route.params;
  const share = useShareCredentials();

  const isCreateLinkMode = mode === 'createLink';
  const buttonTitle = isCreateLinkMode ? 'Create Public Link' : 'Send';

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const tearDownModalIOS = async () => {
    if (Platform.OS !== 'ios') return;
    await InteractionManager.runAfterInteractions();
    await wait(160);
  };

  function renderItem({ item }: RenderItemProps) {
    const { credential } = item;
    const onSelect = () => navigation.navigate('CredentialScreen', { rawCredentialRecord: item });

    return (
      <CredentialItem
        credential={credential}
        onSelect={onSelect}
        chevron
      />
    );
  }

  async function handleButtonPress() {
    if (isCreateLinkMode && selectedCredentials.length > 0) {
      const rawCredentialRecord = selectedCredentials[0];

      // If a public link already exists, navigate directly to PublicLinkScreen
      try {
        const existing = await getPublicViewLink(rawCredentialRecord);
        if (existing) {
          clearGlobalModal();
          await tearDownModalIOS();
          navigation.navigate('PublicLinkScreen', {
            rawCredentialRecord,
            screenMode: PublicLinkScreenMode.ShareCredential,
          });
          return;
        }
      } catch (_) {
        // non-fatal: fall through to creation flow
      }

      // Match PublicLinkScreen gating: block only for expired or warning status
      const candidates: any[] = [
        (rawCredentialRecord as any)?.status,
        (rawCredentialRecord as any)?.status?.type,
        (rawCredentialRecord as any)?.status?.state,
        (rawCredentialRecord as any)?.status?.status,
        (rawCredentialRecord as any)?.credentialStatus,
        (rawCredentialRecord as any)?.credentialStatus?.status,
        (rawCredentialRecord as any)?.credential?.status,
      ].filter(Boolean);
      const hasWarningStatus = candidates.some((v) => String(v).toLowerCase() === 'warning');

      const credential: any = (rawCredentialRecord as any)?.credential ?? {};
      const expiryCandidate =
        credential?.expirationDate ||
        credential?.expiryDate ||
        credential?.expires ||
        credential?.validUntil ||
        (rawCredentialRecord as any)?.expirationDate;
      const isExpired = (() => {
        if (!expiryCandidate) return false;
        const t = Date.parse(String(expiryCandidate));
        return !Number.isNaN(t) && t < Date.now();
      })();

      // Block when expired (ignore Warning-only)
      if (isExpired) {
        const reason = 'This credential has expired, so this action is not allowed.';
        await displayGlobalModal({
          title: 'Unable to Create Public Link',
          cancelButton: false,
          confirmText: 'Close',
          cancelOnBackgroundPress: true,
          body: (
            <>
              <Text style={mixins.modalBodyText}>{reason}</Text>
              <Button
                buttonStyle={mixins.buttonClear}
                titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
                containerStyle={mixins.buttonClearContainer}
                title="What does this mean?"
                onPress={async () => {
                  await Linking.openURL(`${LinkConfig.appWebsite.faq}#public-link`);
                }}
              />
            </>
          ),
        });
        return;
      }

      // Show confirmation modal (reusing the same modal from PublicLinkScreen)
      const confirmed = await displayGlobalModal({
        title: 'Are you sure?',
        confirmText: 'Create Link',
        body: (
          <>
            <Text style={mixins.modalBodyText}>
              Creating a public link will allow anyone with the link to view the
              credential. The link will automatically expire 1 year after
              creation. A public link expiration date is not the same as the expiration date for your credential.
            </Text>
            <Button
              buttonStyle={mixins.buttonClear}
              titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
              containerStyle={mixins.buttonClearContainer}
              title="What does this mean?"
              onPress={async () => {
                await Linking.openURL(`${LinkConfig.appWebsite.faq}#public-link`);
              }}
            />
          </>
        ),
      });

      if (!confirmed) {
        clearGlobalModal();
        return;
      }

      // Show loading modal (ensure no modal is mid-transition)
      clearGlobalModal();
      await tearDownModalIOS();
      displayGlobalModal({
        title: 'Creating Public Link',
        confirmButton: false,
        cancelButton: false,
        body: <LoadingIndicatorDots />,
      });

      try {
        // Create the public link
        const createdLink = await createPublicLinkFor(rawCredentialRecord);

        clearGlobalModal();
        await tearDownModalIOS();

        // Navigate to PublicLinkScreen with the created link
        navigation.navigate('PublicLinkScreen', { 
          rawCredentialRecord,
          screenMode: PublicLinkScreenMode.ShareCredential 
        });
      } catch (err) {
        clearGlobalModal();
        await displayGlobalModal({
          title: 'Unable to Create Public Link',
          cancelButton: false,
          confirmText: 'Close',
          cancelOnBackgroundPress: true,
          body: 'An error occurred while creating the Public Link for this credential.',
        });
      }
    } else {
      share(selectedCredentials);
    }
  }

  return (
    <>
      <NavHeader
        title="Share Preview"
        goBack={() => navigation.navigate('ShareHomeScreen')}
      />
      <View style={styles.container}>
        <FlatList
          style={styles.credentialList}
          data={selectedCredentials}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${index}-${item.credential.id}`}
        />
        <Button
          title={buttonTitle}
          buttonStyle={mixins.buttonPrimary}
          titleStyle={mixins.buttonTitle}
          onPress={() => handleButtonPress()}
        />
      </View>
    </>
  );
}
