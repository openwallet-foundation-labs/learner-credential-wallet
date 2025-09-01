import React, { useContext, useEffect } from 'react';
import { Linking, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';
import qs from 'query-string';

import { LoadingIndicatorDots, NavHeader } from '../../components';
import dynamicStyleSheet from './ShareHomeScreen.styles';
import { ShareHomeScreenProps } from '../../navigation';
import { useDynamicStyles } from '../../hooks';
import { isShareRequestParams, performShareRequest, ShareRequestParams } from '../../lib/shareRequest';
import { HumanReadableError } from '../../lib/error';
import { fmtCredentialCount } from '../../lib/text';
import { NavigationUtil } from '../../lib/navigationUtil';
import { displayGlobalModal } from '../../lib/globalModal';
import { DidRegistryContext } from '../../init/registries';

import { LinkConfig } from '../../../app.config';

export default function ShareHomeScreen({ navigation, route }: ShareHomeScreenProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet);
  const { shareRequestParams } = route.params || {};
  const registries = useContext(DidRegistryContext);

  useEffect(() => {
    if (isShareRequestParams(shareRequestParams)) {
      startShareRequest(shareRequestParams);
    }
  }, [shareRequestParams]);

  async function startShareRequest(params: ShareRequestParams) {
    const issuerName = registries.didEntry(params.client_id)?.name ||
      'Unknown Issuer';

    const confirmedShare = await displayGlobalModal({
      title: 'Share Credentials?',
      confirmText: 'Continue',
      body: (
        <Text style={mixins.modalBodyText}>
          <Text style={[mixins.modalBodyText, mixins.boldText]}>
            {issuerName}
          </Text>{' '}
          is requesting you share credentials. If you trust this requester,
          continue to select the credentials to share.
        </Text>
      ),
    });
    if (!confirmedShare) return goToShareHome();
    const rawCredentialRecords = await NavigationUtil.selectCredentials({
      title: 'Share Credentials',
      instructionText: `Select the credential(s) you want to share with ${issuerName}.`,
      goBack: goToShareHome,
    });
    const rawProfileRecord = await NavigationUtil.selectProfile({
      instructionText: 'Select a profile to associate with the credential(s).',
      goBack: goToShareHome,
    });

    const confirmedSelection = await displayGlobalModal({
      title: 'Are You Sure?',
      confirmText: 'Share',
      body: (
        <Text style={mixins.modalBodyText}>
          You will be sharing {fmtCredentialCount(rawCredentialRecords.length)}{' '}
          with{' '}
          <Text style={[mixins.modalBodyText, mixins.boldText]}>
            {issuerName}
          </Text>
          .
        </Text>
      ),
    });
    if (!confirmedSelection) return goToShareHome();

    try {
      displayGlobalModal({
        title: 'Sharing Credentials',
        confirmButton: false,
        cancelButton: false,
        body: <LoadingIndicatorDots />,
      });

      await performShareRequest(params, rawCredentialRecords, rawProfileRecord);
      await displayGlobalModal({
        title: 'Share Successful',
        confirmText: 'Done',
        body: (
          <Text style={mixins.modalBodyText}>
            You have successfully shared{' '}
            {fmtCredentialCount(rawCredentialRecords.length)} with{' '}
            <Text style={[mixins.modalBodyText, mixins.boldText]}>
              {issuerName}
            </Text>
            .
          </Text>
        ),
      });
    } catch (err) {
      console.error(err);
      await displayGlobalModal({
        title: 'Share Failed',
        confirmText: 'Done',
        body: (
          <Text style={mixins.modalBodyText}>
            There was an error sharing credentials with{' '}
            <Text style={[mixins.modalBodyText, mixins.boldText]}>
              {issuerName}
            </Text>
            .
          </Text>
        ),
      });
    }

    goToShareHome();
  }

  async function goToSendSelect() {
    const selectedCredentials = await NavigationUtil.selectCredentials({
      title: 'Send Credentials',
      instructionText: 'Start by selecting which credential(s) you want to share.',
    });

    navigation.navigate('PresentationPreviewScreen', { selectedCredentials });
  }

  async function goToLinkSelect(): Promise<void> {
    const selectedCredentials = await NavigationUtil.selectCredentials({
      title: 'Create Public Link',
      instructionText: 'Select which credential you want to create a public link to.',
      singleSelect: true,
    });

    navigation.navigate('PresentationPreviewScreen', { 
      selectedCredentials, 
      mode: 'createLink' 
    });
  }

  function goToShareHome() {
    navigation.navigate('ShareHomeScreen');
  }

  return (
    <>
      <NavHeader title="Share" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Button
          title="Create a public link"
          buttonStyle={mixins.buttonIcon}
          containerStyle={mixins.buttonIconContainer}
          titleStyle={mixins.buttonIconTitle}
          onPress={goToLinkSelect}
          iconRight
          icon={
            <MaterialIcons
              name="link"
              size={theme.iconSize}
              color={theme.color.textSecondary}
            />
          }
        />
        <Text style={styles.paragraph}>
            Allows publicly sharing one credential at a time
        </Text>
        <Button
          title="Send a credential"
          buttonStyle={mixins.buttonIcon}
          containerStyle={[mixins.buttonIconContainer, styles.sendButton]}
          titleStyle={mixins.buttonIconTitle}
          onPress={goToSendSelect}
          iconRight
          icon={
            <MaterialIcons
              name="input"
              size={theme.iconSize}
              color={theme.color.textSecondary}
            />
          }
        />
        <Text style={styles.paragraph}>
            Allows sending one or more credentials as a JSON file
        </Text>
      </ScrollView>
    </>
  );
}
