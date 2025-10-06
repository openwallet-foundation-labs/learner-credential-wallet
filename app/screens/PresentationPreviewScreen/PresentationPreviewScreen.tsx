import React, { useContext } from 'react';
import { View, FlatList, Linking } from 'react-native';
import { Button, Text } from 'react-native-elements';

import { CredentialItem, NavHeader, LoadingIndicatorDots } from '../../components';
import dynamicStyleSheet from './PresentationPreviewScreen.styles';
import type { PresentationPreviewScreenProps } from '../../navigation';
import type { RenderItemProps } from './PresentationPreviewScreen.d';
import { useDynamicStyles } from '../../hooks';
import { useShareCredentials } from '../../hooks/useShareCredentials';
import { PublicLinkScreenMode } from '../PublicLinkScreen/PublicLinkScreen';
import { displayGlobalModal, clearGlobalModal } from '../../lib/globalModal';
import { verificationResultFor } from '../../lib/verifiableObject';
import { DidRegistryContext } from '../../init/registries';
import { createPublicLinkFor } from '../../lib/publicLink';
import { LinkConfig } from '../../../app.config';

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
      
      // Check if credential is verified
      const verifyPayload = await verificationResultFor({rawCredentialRecord, registries});
      const verified = verifyPayload?.verified;
      
      if (!verified) {
        await displayGlobalModal({
          title: 'Unable to Create Link',
          cancelButton: false,
          confirmText: 'Close',
          cancelOnBackgroundPress: true,
          body: 'You can only create a public link for a verified credential. Please ensure the credential is verified before trying again.',
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

      // Show loading modal
      displayGlobalModal({
        title: 'Creating Link',
        confirmButton: false,
        cancelButton: false,
        body: <LoadingIndicatorDots />,
      });

      try {
        // Create the public link
        const createdLink = await createPublicLinkFor(rawCredentialRecord);
        
        clearGlobalModal();

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
