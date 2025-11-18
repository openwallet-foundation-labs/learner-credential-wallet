import React from 'react';
import { View, FlatList, Linking, Platform, InteractionManager } from 'react-native';
import { Button, Text } from 'react-native-elements';

import { CredentialItem, NavHeader, LoadingIndicatorDots } from '../../components';
import dynamicStyleSheet from './PresentationPreviewScreen.styles';
import type { PresentationPreviewScreenProps } from '../../navigation';
import type { RenderItemProps } from './PresentationPreviewScreen.d';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import { useShareCredentials } from '../../hooks/useShareCredentials';
import { PublicLinkScreenMode } from '../PublicLinkScreen/PublicLinkScreen';
import { displayGlobalModal, clearGlobalModal } from '../../lib/globalModal';
import { createPublicLinkFor, getPublicViewLink } from '../../lib/publicLink';
import { LinkConfig } from '../../../app.config';
import { canShareCredential } from '../../lib/credentialVerificationStatus';
import { verificationResultFor } from '../../lib/verifiableObject';
import { useContext } from 'react';
import { DidRegistryContext } from '../../init/registries';

export default function PresentationPreviewScreen({
  navigation,
  route,
}: PresentationPreviewScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet);
  const { selectedCredentials, mode = 'send' } = route.params;
  const share = useShareCredentials();
  const registries = useContext(DidRegistryContext);

  const isCreateLinkMode = mode === 'createLink';
  const buttonTitle = isCreateLinkMode ? 'Create Public Link' : 'Send';

  // Get verification status for the first selected credential (for create link mode)
  const firstCredential = selectedCredentials.length > 0 ? selectedCredentials[0] : undefined;
  const verifyPayload = useVerifyCredential(firstCredential);
  const canShare = canShareCredential(verifyPayload);

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

      // Check if credential can be shared
      if (!canShare) {
        await displayGlobalModal({
          title: 'Unable to Create Public Link',
          cancelButton: false,
          confirmText: 'Close',
          cancelOnBackgroundPress: true,
          body: (
            <>
              <Text style={mixins.modalBodyText}>
                This credential has not been verified (invalid signature or revoked status), so this action is not allowed.
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
        return;
      }

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
      // Send mode - check if all selected credentials can be shared
      try {
        // Check verification status for all selected credentials
        for (const credential of selectedCredentials) {
          const verificationResult = await verificationResultFor({ 
            rawCredentialRecord: credential, 
            forceFresh: false, 
            registries 
          });
          
          const credentialVerifyPayload = { 
            loading: false, 
            error: null, 
            result: verificationResult 
          };
          
          const canShareThis = canShareCredential(credentialVerifyPayload);
          
          if (!canShareThis) {
            await displayGlobalModal({
              title: 'Unable to Send Credential(s)',
              cancelButton: false,
              confirmText: 'Close',
              cancelOnBackgroundPress: true,
              body: (
                <>
                  <Text style={mixins.modalBodyText}>
                    One or more credentials have not been verified (invalid signature or revoked status), so this action is not allowed.
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
            return;
          }
        }
        
        // All credentials are verified or have warnings, allow sharing
        share(selectedCredentials);
      } catch (error) {
        console.error('Error checking verification status:', error);
        await displayGlobalModal({
          title: 'Unable to Verify Credential(s)',
          cancelButton: false,
          confirmText: 'Close',
          cancelOnBackgroundPress: true,
          body: (
            <Text style={mixins.modalBodyText}>
              An error occurred while checking credential verification status. Please try again.
            </Text>
          ),
        });
      }
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
