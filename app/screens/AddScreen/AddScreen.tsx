import React, { useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Text, Button } from 'react-native-elements';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native-paper';

import dynamicStyleSheet from './AddScreen.styles';
import { stageCredentials } from '../../store/slices/credentialFoyer';
import { NavHeader } from '../../components';
import { credentialRequestParamsFromQrText, credentialsFrom, isDeepLink } from '../../lib/decode';
import { PresentationError } from '../../types/presentation';
import { errorMessageMatches, HumanReadableError } from '../../lib/error';
import { navigationRef } from '../../navigation/navigationRef';
import { CredentialRequestParams } from '../../lib/credentialRequest';
import { pickAndReadFile } from '../../lib/import';
import { displayGlobalModal } from '../../lib/globalModal';
import { useAppDispatch, useDynamicStyles } from '../../hooks';
import { ScrollView } from 'react-native-gesture-handler';
import { cleanCopy } from '../../lib/encode';
import { NavigationUtil } from '../../lib/navigationUtil';
import { CANCEL_PICKER_MESSAGES } from '../../../app.config';

export default function AddScreen(): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet);
  const [inputValue, setInputValue] = useState('');
  const dispatch = useAppDispatch();
  const inputIsValid = inputValue !== '';

  function onPressQRScreen() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('QRScreen', {
        instructionText: 'Scan a shared QR code from your issuer to request your credentials.',
        onReadQRCode,
      });
    }
  }

  async function goToCredentialFoyer(credentialRequestParams?: CredentialRequestParams) {
    const rawProfileRecord = await NavigationUtil.selectProfile();
    navigationRef.navigate('AcceptCredentialsNavigation', {
      screen: 'ApproveCredentialsScreen',
      params: {
        rawProfileRecord,
        credentialRequestParams
      }
    });
  }

  async function addCredentialsFrom(text: string) {
    text = text.trim();

    if (isDeepLink(text)) {
      const params = credentialRequestParamsFromQrText(text);
      goToCredentialFoyer(cleanCopy(params));
    } else {
      const credentials = await credentialsFrom(text);
      dispatch(stageCredentials(credentials));
      goToCredentialFoyer();
    }
  }

  async function addFromFile() {
    try {
      const text = await pickAndReadFile();
      await addCredentialsFrom(text);
    } catch (err) {
      if (errorMessageMatches(err, CANCEL_PICKER_MESSAGES)) return;

      console.error(err);
      await displayGlobalModal({
        title: 'Unable to Add Credentials',
        body: 'Ensure the file contains one or more credentials, and is a supported file type.' ,
        cancelButton: false,
        confirmText: 'Close',
      });
    }
  }

  async function addFromUrl() {
    try {
      await addCredentialsFrom(inputValue);
    } catch (err) {
      console.error(err);
      await displayGlobalModal({
        title: 'Unable to Add Credentials',
        body: 'Ensure the URL references a file that contains one or more credentials.',
        cancelButton: false,
        confirmText: 'Close',
      });
    }
  }

  async function onReadQRCode(text: string) {
    AccessibilityInfo.announceForAccessibility('QR Code Scanned');

    try {
      await addCredentialsFrom(text);
    } catch (err) {
      console.warn(err);

      if (errorMessageMatches(err, Object.values(PresentationError))) {
        throw new HumanReadableError(err.message);
      } else {
        throw new HumanReadableError('An error was encountered when parsing this QR code.');
      }
    }
  }

  return (
    <>
      <NavHeader title="Add Credential" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.container}>
          <Text style={styles.paragraph}>
         To add a credential, follow an approved link from an issuer or use the options below.
          </Text>
          <Button
            title="Scan QR code"
            buttonStyle={mixins.buttonIcon}
            containerStyle={[mixins.buttonIconContainer, mixins.noFlex]}
            titleStyle={mixins.buttonIconTitle}
            iconRight
            onPress={onPressQRScreen}
            icon={
              <MaterialIcons
                name="qr-code-scanner"
                size={theme.iconSize}
                color={theme.color.iconInactive}
              />
            }
          />
          <Button
            title="Add from file"
            buttonStyle={mixins.buttonIcon}
            containerStyle={[mixins.buttonIconContainer, mixins.noFlex]}
            titleStyle={mixins.buttonIconTitle}
            iconRight
            onPress={addFromFile}
            icon={
              <MaterialCommunityIcons
                name="file-upload"
                size={theme.iconSize}
                color={theme.color.iconInactive}
              />
            }
          />
          <View style={styles.sectionContainer}>
            <View style={styles.actionInputContainer}>
              <TextInput
                autoCapitalize="none"
                multiline
                value={inputValue}
                onChangeText={setInputValue}
                style={styles.input}
                outlineColor={theme.color.iconInactive}
                selectionColor={theme.color.textPrimary}
                theme={{
                  colors: {
                    placeholder: theme.color.textSecondary,
                    text: theme.color.textPrimary,
                    primary: theme.color.brightAccent,
                  },
                }}
                label="Paste JSON or URL"
                mode="outlined"
                keyboardAppearance={theme.keyboardAppearance}
                onTextInput={() => {}}
                tvParallaxProperties={undefined}
              />
              <Button
                title="Add"
                buttonStyle={[mixins.button, mixins.buttonPrimary, styles.actionButton]}
                containerStyle={[mixins.buttonContainer, styles.actionButtonContainer]}
                titleStyle={[mixins.buttonTitle]}
                onPress={addFromUrl}
                disabled={!inputIsValid}
                disabledStyle={styles.actionButtonInactive}
                disabledTitleStyle={styles.actionButtonInactiveTitle}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
