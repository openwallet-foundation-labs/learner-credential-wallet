import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Linking, TextInput as RNTextInput, Platform } from 'react-native';
import { Button, Text } from 'react-native-elements';
import { TextInput } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import OutsidePressHandler from 'react-native-outside-press';
import Share from 'react-native-share';

import { PublicLinkScreenProps } from './PublicLinkScreen.d';
import dynamicStyleSheet from './PublicLinkScreen.styles';
import { LoadingIndicatorDots, NavHeader } from '../../components';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { createPublicLinkFor, getPublicViewLink, linkedinUrlFrom, unshareCredential } from '../../lib/publicLink';
import { useDynamicStyles, useShareCredentials } from '../../hooks';
//import { useDynamicStyles, useShareCredentials, useVerifyCredential } from '../../hooks';
import { clearGlobalModal, displayGlobalModal } from '../../lib/globalModal';
import { navigationRef } from '../../navigation';

import { convertSVGtoPDF } from '../../lib/svgToPdf';
import { PDF } from '../../types/pdf';
import { LinkConfig } from '../../../app.config';

export enum PublicLinkScreenMode {
  Default,
  ShareCredential
}

export default function PublicLinkScreen({ navigation, route }: PublicLinkScreenProps): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet);

  const share = useShareCredentials();
  const { rawCredentialRecord, screenMode = PublicLinkScreenMode.Default } = route.params;
  const { credential } = rawCredentialRecord;
  const { name } = credential;
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [renderMethodAvailable, setRenderMethodAvailable] = useState(false);

  const [justCreated, setJustCreated] = useState(false);
  const [pdf, setPdf] = useState<PDF | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null); // State to store base64 data URL of QR code

  const [openedExportPdfModal, setOpenedExportPdfModal] = useState(false);

  const qrCodeRef = useRef<any>(null); // Reference to QRCode component to access toDataURL
  //const isVerified = useVerifyCredential(rawCredentialRecord)?.result.verified;
  const inputRef = useRef<RNTextInput | null>(null);
  const disableOutsidePressHandler = inputRef.current?.isFocused() ?? false;
  const selectionColor = Platform.select({ ios: theme.color.brightAccent, android: theme.color.highlightAndroid });

  useEffect(() => {
    if (publicLink && qrCodeBase64 && renderMethodAvailable) {
      handleGeneratePDF(publicLink); // Generate PDF once both are available
    }
  }, [publicLink, qrCodeBase64]);

  useEffect(() => {
    if (pdf && pdf.filePath && openedExportPdfModal) {
      Share.open({ url: `file://${pdf.filePath}` })
        .then((res) => {
          console.log('Share successful:', res);
        })
        .catch((err) => {
          console.error('Share failed:', err);
        });
    }
  }, [pdf]);

  useEffect(() => {
    if ('renderMethod' in credential) {
      setRenderMethodAvailable(true);
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (qrCodeRef.current) {
        qrCodeRef.current.toDataURL((dataUrl: string) => {
          setQrCodeBase64(dataUrl);
        });
      }

      let rawPdf;
      try {
        rawPdf = await convertSVGtoPDF(credential, publicLink, qrCodeBase64);
        setPdf(rawPdf);
      } catch (e) {
        console.log('ERROR GENERATING PDF:');
        console.log(e);
      }
    };

    fetchData();
  }, [qrCodeBase64, publicLink]); // Run when qrCodeBase64 or publicLink changes

  const screenTitle = {
    [PublicLinkScreenMode.Default]: 'Public Link',
    [PublicLinkScreenMode.ShareCredential]: 'Share Credential',
  }[screenMode];

  function displayLoadingModal() {
    displayGlobalModal({
      title: 'Creating Public Link',
      confirmButton: false,
      cancelButton: false,
      body: <LoadingIndicatorDots />
    });
  }

  function displayErrorModal(err: Error) {
    function goToErrorSource() {
      clearGlobalModal();
      navigationRef.navigate('ViewSourceScreen', {
        screenTitle: 'Public Link Error',
        data: String(err),
      });
    }

    displayGlobalModal({
      title: 'Unable to Create Public Link',
      cancelOnBackgroundPress: true,
      cancelButton: false,
      confirmText: 'Close',
      body: (
        <>
          <Text style={mixins.modalBodyText}>An error ocurred while creating the Public Link for this credential.</Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="Details"
            onPress={goToErrorSource}
          />
        </>
      )
    });
  }

  // function displayNotVerifiedModal() {
  //   return displayGlobalModal({
  //     title: 'Unable to Share Credential',
  //     body: 'Only verified credentials can be shared.',
  //     confirmText: 'Close',
  //     cancelButton: false,
  //     cancelOnBackgroundPress: true,
  //   });
  // }

  async function createPublicLink() {
    try {
      displayLoadingModal();

      // Ensure load time is not less than one second (to prevent modal flashing)
      const [publicLink] = await Promise.all([
        createPublicLinkFor(rawCredentialRecord),
        new Promise((res) => setTimeout(res, 1000))
      ]);

      clearGlobalModal();

      setPublicLink(publicLink);
      setJustCreated(true);
    } catch (err) {
      displayErrorModal(err as Error);
    }
  }

  async function confirmCreatePublicLink() {
    if (!isVerified) {
      return displayNotVerifiedModal();
    }

    const confirmed = await displayGlobalModal({
      title: 'Are you sure?',
      confirmText: 'Create Link',
      onRequestClose: undefined,
      body: (
        <>
          <Text style={mixins.modalBodyText}>Creating a public link will allow anyone with the link to view the credential. The link will automatically expire 1 year after creation.</Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={() => Linking.openURL(`${LinkConfig.appWebsite.faq}#public-link`)}
          />
        </>
      )
    });

    if (!confirmed) return clearGlobalModal();
    await createPublicLink();
  }

  async function unshareLink() {
    const confirmed = await displayGlobalModal({
      title: 'Are you sure?',
      confirmText: 'Unshare Link',
      body: (
        <>
          <Text style={mixins.modalBodyText}>Unsharing a public link will remove the ability of others to view the credential. If you share the same credential in the future it will have a different public link.</Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={() => Linking.openURL(`${LinkConfig.appWebsite.faq}#public-link-unshare`)}
          />
        </>
      )
    });

    if (!confirmed) return;

    try {
      await unshareCredential(rawCredentialRecord);
    } catch (err) {
      console.log('Error unsharing credential:', err);
    }

    setPublicLink(null);
    setJustCreated(false);

    if (screenMode === PublicLinkScreenMode.Default) {
      navigation.popToTop();
    }
  }

  async function openLink() {
    if (publicLink !== null) {
      await Linking.canOpenURL(publicLink);
      Linking.openURL(publicLink);
    }
  }

  function copyToClipboard() {
    if (publicLink !== null) {
      Clipboard.setString(publicLink);
    }
  }

  async function loadShareUrl() {
    const url = await getPublicViewLink(rawCredentialRecord);
    if (url === null && screenMode === PublicLinkScreenMode.Default) {
      // Wait for screen transition to finish
      await new Promise((res) => setTimeout(res, 1000));
      await createPublicLink();
    } else if (url !== null) {
      setPublicLink(url);
    }
  }

  async function exportToPdf() {
    setOpenedExportPdfModal(true);
    // if (!isVerified) {
    //   return displayNotVerifiedModal(); // Show modal if the credential isn't verified
    // }

    const confirmed = await displayGlobalModal({
      title: 'Are you sure?',
      confirmText: 'Export as PDF',
      cancelOnBackgroundPress: true,
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            {publicLink !== null
              ? 'This will export your credential to PDF.'
              : 'You can only export your credential as a PDF after creating a public link. The link will automatically expire 1 year after creation. Click "Export as PDF" to generate a public link first and then export to PDF.'
            }
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={() => Linking.openURL(`${LinkConfig.appWebsite.faq}#export-to-pdf`)}
          />
        </>
      )
    });

    if (!confirmed) return;
    if (!publicLink) {
      await createPublicLink();
    }

    await handleGeneratePDF(publicLink);
  }

  // Function to handle PDF generation
  async function handleGeneratePDF(publicLink: string | null) {
    if (!publicLink) {
      return;
    }

    if (!qrCodeBase64) {
      if (qrCodeRef.current) {
        qrCodeRef.current.toDataURL((dataUrl: string) => {
          setQrCodeBase64(dataUrl);
        });
      } else {
        return; // Early return if QR code cannot be generated
      }
    }

    try {
      const generatedPdf = await convertSVGtoPDF(credential, publicLink, qrCodeBase64);
      setPdf(generatedPdf); // Ensure that pdf state is updated with the generated PDF
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    setOpenedExportPdfModal(false);
  }

  async function shareToLinkedIn() {
    // if (!isVerified) {
    //   return displayNotVerifiedModal();
    // }

    const confirmed = await displayGlobalModal({
      title: 'Are you sure?',
      confirmText: 'Add to LinkedIn',
      cancelOnBackgroundPress: true,
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            {publicLink !== null
              ? 'This will add the credential to your LinkedIn profile.'
              : 'This will add the credential to your LinkedIn profile after creating a public link. The link will automatically expire 1 year after creation.'
            }
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={() => Linking.openURL(`${LinkConfig.appWebsite.faq}#add-to-linkedin`)}
          />
        </>
      )
    });

    if (!confirmed) return;
    if (!publicLink) {
      await createPublicLink();
    }

    const url = await linkedinUrlFrom(rawCredentialRecord);
    await Linking.canOpenURL(url);
    Linking.openURL(url);
  }

  function onFocusInput() {
    inputRef.current?.setNativeProps({ selection: { start: 0, end: publicLink?.length } });
  }

  function blurInput() {
    inputRef.current?.blur();
  }

  useEffect(() => {
    loadShareUrl();
  }, []);

  const instructionsText = useMemo(() => {
    switch (screenMode) {
    case PublicLinkScreenMode.Default:
      return 'Copy the link to share, or add to your LinkedIn profile.';
    case PublicLinkScreenMode.ShareCredential:
      if (!publicLink) return 'Create a public link that anyone can use to view this credential, export to PDF, add to your LinkedIn profile, or send a json copy.';
      if (justCreated) return 'Public link created. Copy the link to share, export to PDF, add to your LinkedIn profile, or send a json copy.';
      return 'Public link already created. Copy the link to share, add to your LinkedIn profile, or send a json copy.';
    }
  }, [screenMode, publicLink, justCreated]);

  function LinkInstructions() {
    return (
      <>
        {screenMode === PublicLinkScreenMode.Default && (
          <Text style={styles.title}>
            {name || 'Credential'}
          </Text>
        )}
        <Text style={styles.instructions}>{instructionsText}</Text>
      </>
    );
  }

  return (
    <>
      <NavHeader
        title={screenTitle}
        goBack={() => navigation.goBack()}
      />
      <View style={styles.outerContainer}>
        <ScrollView
          style={styles.scrollContainer}
          accessible={false}
        >
          <View style={styles.container}>
            <LinkInstructions />
            {publicLink !== null ? (
              <View>
                <View style={styles.link}>
                  <OutsidePressHandler
                    style={mixins.flex}
                    onOutsidePress={blurInput}
                    disabled={disableOutsidePressHandler}
                  >
                    <TextInput
                      ref={inputRef}
                      style={{ ...mixins.input, ...styles.linkText }}
                      value={publicLink}
                      selectionColor={selectionColor}
                      theme={{
                        colors: {
                          placeholder: theme.color.textPrimary,
                          text: theme.color.textPrimary,
                          disabled: theme.color.textPrimary,
                          primary: theme.color.brightAccent,
                        }
                      }}
                      autoCorrect={false}
                      spellCheck={false}
                      mode="outlined"
                      onFocus={onFocusInput}
                      showSoftInputOnFocus={false}
                    />
                  </OutsidePressHandler>
                  <Button
                    title="Copy"
                    buttonStyle={{ ...mixins.buttonPrimary, ...styles.copyButton }}
                    containerStyle={{ ...mixins.buttonContainer, ...styles.copyButtonContainer }}
                    titleStyle={mixins.buttonTitle}
                    onPress={copyToClipboard}
                  />
                </View>
                <View style={styles.actions}>
                  <Button
                    title="Unshare"
                    buttonStyle={{ ...mixins.buttonIcon, ...styles.actionButton }}
                    containerStyle={{ ...mixins.buttonContainer }}
                    titleStyle={mixins.buttonIconTitle}
                    onPress={unshareLink}
                    icon={
                      <MaterialIcons
                        style={styles.actionIcon}
                        name="link-off"
                        size={theme.iconSize}
                        color={theme.color.iconInactive}
                      />
                    }
                  />
                  <View style={styles.spacer} />
                  <Button
                    title="View Link"
                    buttonStyle={{ ...mixins.buttonIcon, ...styles.actionButton }}
                    containerStyle={mixins.buttonContainer}
                    titleStyle={mixins.buttonIconTitle}
                    onPress={openLink}
                    icon={
                      <MaterialIcons
                        style={styles.actionIcon}
                        name="launch"
                        size={theme.iconSize}
                        color={theme.color.iconInactive}
                      />
                    }
                  />
                </View>
              </View>
            ) : (
              <Button
                title="Create Public Link"
                buttonStyle={{ ...mixins.buttonIcon, ...mixins.buttonPrimary }}
                containerStyle={{ ...mixins.buttonIconContainer, ...styles.createLinkButtonContainer }}
                titleStyle={mixins.buttonTitle}
                iconRight
                onPress={confirmCreatePublicLink}
                icon={
                  <MaterialIcons
                    name="link"
                    size={theme.iconSize}
                    color={theme.color.textPrimaryDark}
                  />
                }
              />
            )
            }

            <View style={styles.otherOptionsContainer}>
              {renderMethodAvailable && (
                <Button
                  title="Export To PDF"
                  buttonStyle={mixins.buttonIcon}
                  containerStyle={mixins.buttonIconContainer}
                  titleStyle={mixins.buttonIconTitle}
                  iconRight
                  onPress={exportToPdf}
                  icon={
                    <Ionicons
                      name="document-text"
                      size={theme.iconSize}
                      color={theme.color.iconInactive}
                    />
                  }
                />
              )}
              <Button
                title="Add to LinkedIn Profile"
                buttonStyle={mixins.buttonIcon}
                containerStyle={mixins.buttonIconContainer}
                titleStyle={mixins.buttonIconTitle}
                iconRight
                onPress={shareToLinkedIn}
                icon={
                  <Ionicons
                    name="logo-linkedin"
                    size={theme.iconSize}
                    color={theme.color.iconInactive}
                  />
                }
              />
              {screenMode === PublicLinkScreenMode.ShareCredential && (
                <View>
                  <Button
                    title="Send Credential"
                    buttonStyle={mixins.buttonIcon}
                    containerStyle={mixins.buttonIconContainer}
                    titleStyle={mixins.buttonIconTitle}
                    iconRight
                    onPress={() => share([rawCredentialRecord])}
                    icon={
                      <MaterialIcons
                        name="input"
                        size={theme.iconSize}
                        color={theme.color.iconInactive}
                      />
                    }
                  />
                  <Text style={styles.paragraph}>
                    Allows sending one or more credentials as a JSON file
                  </Text>
                </View>
              )}

              {publicLink !== null && (
                <View style={styles.bottomSection}>
                  <Text style={mixins.paragraphText}>
                    You may also share the public link by having another person scan this QR code.
                  </Text>
                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrCode}>
                      <QRCode
                        value={publicLink}  // The value to encode in the QR code
                        size={200}  // The size of the QR code
                        getRef={(ref) => (qrCodeRef.current = ref)}  // Set the ref to access toDataURL
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
