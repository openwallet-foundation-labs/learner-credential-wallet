import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  Linking,
  TextInput as RNTextInput,
  Platform,
  InteractionManager
} from 'react-native'
import { Button, Text } from 'react-native-elements'
import { TextInput } from 'react-native-paper'
import QRCode from 'react-native-qrcode-svg'
import Clipboard from '@react-native-clipboard/clipboard'
import OutsidePressHandler from 'react-native-outside-press'
import Share from 'react-native-share'

import { PublicLinkScreenParams } from './PublicLinkScreen.d'
import dynamicStyleSheet from './PublicLinkScreen.styles'
import LoadingIndicatorDots from '../../components/LoadingIndicatorDots/LoadingIndicatorDots'
import NavHeader from '../../components/NavHeader/NavHeader'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import {
  createPublicLinkFor,
  getPublicViewLink,
  linkedinUrlFrom,
  unshareCredential
} from '../../lib/publicLink'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { useShareCredentials } from '../../hooks/useShareCredentials'
import { clearGlobalModal, displayGlobalModal } from '../../lib/globalModal'
import { navigationRef } from '../../navigation/navigationRef'

import { convertSVGtoPDF } from '../../lib/svgToPdf'
import { PDF } from '../../types/pdf'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - app.config.js doesn't have type declarations
import { LinkConfig } from '../../../app.config'

export enum PublicLinkScreenMode {
  Default,
  ShareCredential
}

// ---- Small timing helpers (avoid rAF global for lint) ----
const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))
const nextFrame = () => wait(16) // ~1 frame

export default function PublicLinkScreen({
  navigation,
  route
}: {
  navigation: any
  route: { params: PublicLinkScreenParams }
}): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet)

  const share = useShareCredentials()
  const { rawCredentialRecord, screenMode = PublicLinkScreenMode.Default } =
    route.params
  const { credential } = rawCredentialRecord
  const { name } = credential

  const [publicLink, setPublicLink] = useState<string | null>(null)
  const [renderMethodAvailable, setRenderMethodAvailable] = useState(false)

  const [justCreated, setJustCreated] = useState(false)
  const [pdf, setPdf] = useState<PDF | null>(null)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [openedExportPdfModal, setOpenedExportPdfModal] = useState(false)

  const qrCodeRef = useRef<any>(null)

  // ---- Selection (no setNativeProps) ----
  const inputRef = useRef<RNTextInput | null>(null)
  const [selection, setSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined)
  const disableOutsidePressHandler = inputRef.current?.isFocused() ?? false
  const selectionColor = Platform.select({
    ios: theme.color.brightAccent,
    android: theme.color.highlightAndroid
  })

  // ---- QR capture timing ----
  const [qrReady, setQrReady] = useState(false)
  const onQRCodeLayout = () => setQrReady(true)

  // Gate all QR/PDF side-effects; do NOT run for "Send Credential" JSON flow
  const [allowQrWork, setAllowQrWork] = useState(false)

  // Prevent double-presenting native sheets
  const [presentingNative, setPresentingNative] = useState(false)

  // ---------- iOS-safe helpers (avoid “presenting on itself”) ----------
  const tearDownModalIOS = async () => {
    if (Platform.OS !== 'ios') return
    await InteractionManager.runAfterInteractions()
    await wait(160)
    await nextFrame()
  }

  const safelyBeforeNativePresent = async () => {
    clearGlobalModal() // close any RN modal first
    await tearDownModalIOS() // wait for dismissal to finish on iOS
  }

  const presentModalSafely = async (
    config: Parameters<typeof displayGlobalModal>[0]
  ) => {
    await tearDownModalIOS() // ensure no modal is mid-transition
    return displayGlobalModal(config)
  }

  // Swap current modal content → loading (no dismiss/re-present → no flash)
  const swapModalToLoading = () => {
    displayGlobalModal({
      title: 'Creating Public Link',
      confirmButton: false,
      cancelButton: false,
      body: <LoadingIndicatorDots />
    })
  }
  // --------------------------------------------------------------------

  // Render-method availability
  useEffect(() => {
    setRenderMethodAvailable('renderMethod' in credential)
  }, [credential])

  // On mount, defensively clear any stale global modal from previous screens
  useEffect(() => {
    clearGlobalModal()
  }, [])

  // If a link appears (either created now or loaded), ensure any loading modal is closed
  useEffect(() => {
    if (publicLink) {
      clearGlobalModal()
      void tearDownModalIOS()
    }
  }, [publicLink])

  // Extra safety: if we just created a link, also ensure any modal is closed
  useEffect(() => {
    if (justCreated) {
      clearGlobalModal()
      void tearDownModalIOS()
    }
  }, [justCreated])

  // Load/create share URL on mount
  useEffect(() => {
    ;(async () => {
      const url = await getPublicViewLink(rawCredentialRecord)
      if (url === null && screenMode === PublicLinkScreenMode.Default) {
        if (Platform.OS === 'ios') await wait(300)
        await createPublicLink() // auto path can still use standard loading modal
      } else if (url !== null) {
        setPublicLink(url)
      }
    })()
  }, [rawCredentialRecord, screenMode]) // exhaustive deps

  // Safely capture QR only when allowed (PDF flow), link exists, and view is laid out
  useEffect(() => {
    if (!allowQrWork || !publicLink || !qrReady || qrCodeBase64) return
    ;(async () => {
      await InteractionManager.runAfterInteractions()
      await nextFrame()
      qrCodeRef.current?.toDataURL((data: string) => {
        setQrCodeBase64(data)
      })
    })()
  }, [allowQrWork, publicLink, qrReady, qrCodeBase64])

  // Generate PDF once we have both link & captured QR (PDF flow only)
  useEffect(() => {
    if (!allowQrWork || !publicLink || !qrCodeBase64) return
    ;(async () => {
      try {
        const rawPdf = await convertSVGtoPDF(
          credential,
          publicLink,
          qrCodeBase64
        )
        setPdf(rawPdf)
      } catch (e) {
        console.log('ERROR GENERATING PDF:', e)
        await presentErrorModal(
          'Unable to Export PDF',
          'An error occurred while generating the PDF.',
          String(e)
        )
      }
    })()
  }, [allowQrWork, credential, publicLink, qrCodeBase64])

  // Auto open share sheet for PDF once ready
  useEffect(() => {
    if (pdf && pdf.filePath && openedExportPdfModal) {
      ;(async () => {
        if (presentingNative) return
        setPresentingNative(true)
        try {
          await safelyBeforeNativePresent()
          await Share.open({ url: `file://${pdf.filePath}` })
        } catch (err) {
          console.error('Share failed:', err)
        } finally {
          setOpenedExportPdfModal(false)
          setPresentingNative(false)
        }
      })()
    }
  }, [pdf, openedExportPdfModal, presentingNative])

  const screenTitle =
    {
      [PublicLinkScreenMode.Default]: 'Public Link',
      [PublicLinkScreenMode.ShareCredential]: 'Share Credential'
    }[screenMode as PublicLinkScreenMode] ?? 'Public Link'

  // ---------- Global modal variants (UI unchanged) ----------
  const displayLoadingModal = () => {
    // non-interactive; do not await
    void presentModalSafely({
      title: 'Creating Public Link',
      confirmButton: false,
      cancelButton: false,
      body: <LoadingIndicatorDots />
    })
  }

  async function presentErrorModal(
    title: string,
    message: string,
    detail?: string
  ) {
    await presentModalSafely({
      title,
      cancelOnBackgroundPress: true,
      cancelButton: false,
      confirmText: 'Close',
      body: (
        <>
          <Text style={mixins.modalBodyText}>{message}</Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="Details"
            onPress={async () => {
              clearGlobalModal()
              await tearDownModalIOS()
              navigationRef.navigate('ViewSourceScreen', {
                screenTitle: title,
                data: detail ?? ''
              })
            }}
          />
        </>
      )
    })
  }

  async function presentNotVerifiedModal(
    action: 'create' | 'export' | 'linkedin' | 'share'
  ) {
    const titles = {
      create: 'Unable to Create Public Link',
      export: 'Unable to Export PDF',
      linkedin: 'Unable to Add to LinkedIn',
      share: 'Unable to Share Credential'
    } as const

    const anchors = {
      create: 'public-link',
      export: 'export-to-pdf',
      linkedin: 'add-to-linkedin',
      share: 'public-link'
    } as const

    await presentModalSafely({
      title: titles[action],
      cancelOnBackgroundPress: true,
      cancelButton: false,
      confirmText: 'Close',
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            This credential has not been verified (invalid signature or revoked
            status), so this action is not allowed.
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={async () => {
              await safelyBeforeNativePresent()
              await Linking.openURL(
                `${LinkConfig.appWebsite.faq}#${anchors[action]}`
              )
            }}
          />
        </>
      )
    })
  }
  // ------------------------------------------------------------------

  // Used by auto-create and “create if needed” flows (PDF/LinkedIn)
  async function createPublicLink() {
    try {
      await tearDownModalIOS() // ensure previous confirm is gone
      displayLoadingModal() // show spinner (no await)

      const createdLink = await createPublicLinkFor(rawCredentialRecord)

      clearGlobalModal()
      await tearDownModalIOS()

      setPublicLink(createdLink)
      setJustCreated(true)

      // Belt-and-suspenders: ensure any lingering modal is cleared after UI settles
      setTimeout(() => clearGlobalModal(), 0)
      setTimeout(() => clearGlobalModal(), 300)
    } catch (err) {
      clearGlobalModal()
      await tearDownModalIOS()
      await presentErrorModal(
        'Unable to Create Public Link',
        'An error occurred while creating the Public Link for this credential.',
        String(err)
      )
    }
  }

  // BUTTON: Create Public Link (single-modal swap to avoid flash)
  async function confirmCreatePublicLink() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Create Link',
      onRequestClose: undefined,
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            Creating a public link will allow anyone with the link to view the
            credential. The link will automatically expire 1 year after
            creation. A public link expiration date is not the same as the
            expiration date for your credential.
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={async () => {
              await safelyBeforeNativePresent()
              await Linking.openURL(`${LinkConfig.appWebsite.faq}#public-link`)
            }}
          />
        </>
      )
    })

    if (!confirmed) {
      clearGlobalModal()
      return
    }

    // 🔑 Swap existing confirm modal → loading (no close/open → no flash)
    clearGlobalModal()
    await tearDownModalIOS()
    swapModalToLoading()

    try {
      const createdLink = await createPublicLinkFor(rawCredentialRecord)
      setPublicLink(createdLink)
      setJustCreated(true)

      clearGlobalModal() // close after success
      await tearDownModalIOS()

      // Extra safety to avoid stuck spinner in edge cases
      setTimeout(() => clearGlobalModal(), 0)
      setTimeout(() => clearGlobalModal(), 300)
    } catch (err) {
      clearGlobalModal() // close loading first
      await tearDownModalIOS()
      await presentErrorModal(
        'Unable to Create Public Link',
        'An error occurred while creating the Public Link for this credential.',
        String(err)
      )
    }
  }

  async function unshareLink() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Unshare Link',
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            Unsharing a public link will remove the ability of others to view
            the credential. If you share the same credential in the future it
            will have a different public link.
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={async () => {
              await safelyBeforeNativePresent()
              await Linking.openURL(
                `${LinkConfig.appWebsite.faq}#public-link-unshare`
              )
            }}
          />
        </>
      )
    })

    if (!confirmed) return

    clearGlobalModal()
    await tearDownModalIOS()

    try {
      await unshareCredential(rawCredentialRecord)
    } catch (err) {
      console.log('Error unsharing credential:', err)
    }

    setPublicLink(null)
    setJustCreated(false)

    if (screenMode === PublicLinkScreenMode.Default) {
      navigation.popToTop()
    }
  }

  async function openLink() {
    if (!publicLink || presentingNative) return
    try {
      setPresentingNative(true)
      await safelyBeforeNativePresent()
      await Linking.canOpenURL(publicLink)
      await Linking.openURL(publicLink)
    } finally {
      setPresentingNative(false)
    }
  }

  function copyToClipboard() {
    if (publicLink) Clipboard.setString(publicLink)
  }

  async function exportToPdf() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Export as PDF',
      cancelOnBackgroundPress: true,
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            {publicLink
              ? 'This will export your credential to PDF.'
              : 'You can only export your credential as a PDF after creating a public link. The link will automatically expire 1 year after creation. Click "Export as PDF" to generate a public link first and then export to PDF.'}
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={async () => {
              await safelyBeforeNativePresent()
              await Linking.openURL(
                `${LinkConfig.appWebsite.faq}#export-to-pdf`
              )
            }}
          />
        </>
      )
    })

    if (!confirmed) {
      clearGlobalModal()
      return
    }

    clearGlobalModal()
    await tearDownModalIOS()

    setAllowQrWork(true)
    setOpenedExportPdfModal(true)

    if (!publicLink) {
      await createPublicLink()
    }
  }

  async function shareToLinkedIn() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Add to LinkedIn',
      cancelOnBackgroundPress: true,
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            {publicLink
              ? 'This will add the credential to your LinkedIn profile.'
              : 'This will add the credential to your LinkedIn profile after creating a public link. The link will automatically expire 1 year after creation.'}
          </Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="What does this mean?"
            onPress={async () => {
              await safelyBeforeNativePresent()
              await Linking.openURL(
                `${LinkConfig.appWebsite.faq}#add-to-linkedin`
              )
            }}
          />
        </>
      )
    })

    if (!confirmed) {
      clearGlobalModal()
      return
    }

    await safelyBeforeNativePresent()

    if (!publicLink) {
      await createPublicLink()
    }

    if (presentingNative) return
    setPresentingNative(true)
    try {
      const url = await linkedinUrlFrom(rawCredentialRecord)
      await Linking.canOpenURL(url)
      await Linking.openURL(url)
    } finally {
      setPresentingNative(false)
    }
  }

  // Send credential as JSON
  const onSendCredential = async () => {
    if (presentingNative) return
    setPresentingNative(true)
    try {
      await safelyBeforeNativePresent()
      await share([rawCredentialRecord])
    } catch (e) {
      console.log('Share JSON failed:', e)
    } finally {
      setPresentingNative(false)
    }
  }

  function onFocusInput() {
    const len = publicLink?.length ?? 0
    setSelection({ start: 0, end: len })
  }

  function blurInput() {
    inputRef.current?.blur()
  }

  const instructionsText = useMemo(() => {
    switch (screenMode) {
      case PublicLinkScreenMode.Default:
        return 'Copy the link to share, or add to your LinkedIn profile.'
      case PublicLinkScreenMode.ShareCredential:
        if (!publicLink)
          return 'Create a public link that anyone can use to view this credential, export to PDF, add to your LinkedIn profile, or send a json copy.'
        if (justCreated)
          return 'Public link created. Copy the link to share, export to PDF, add to your LinkedIn profile, or send a json copy.'
        return 'Public link already created. Copy the link to share, add to your LinkedIn profile, or send a json copy.'
    }
  }, [screenMode, publicLink, justCreated])

  function LinkInstructions() {
    return (
      <>
        {screenMode === PublicLinkScreenMode.Default && (
          <Text style={styles.title}>{name || 'Credential'}</Text>
        )}
        <Text style={styles.instructions}>{instructionsText}</Text>
      </>
    )
  }

  return (
    <>
      <NavHeader title={screenTitle} goBack={() => navigation.goBack()} />
      <View style={styles.outerContainer}>
        <ScrollView style={styles.scrollContainer} accessible={false}>
          <View style={styles.container}>
            <LinkInstructions />

            {publicLink ? (
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
                          primary: theme.color.brightAccent
                        }
                      }}
                      autoCorrect={false}
                      spellCheck={false}
                      mode="outlined"
                      onFocus={onFocusInput}
                      showSoftInputOnFocus={false}
                      onTextInput={() => {}}
                      selection={selection}
                      onSelectionChange={(e) =>
                        setSelection(e.nativeEvent.selection)
                      }
                      tvParallaxProperties={{}} // <-- add back to satisfy TS types
                    />
                  </OutsidePressHandler>

                  <Button
                    title="Copy"
                    buttonStyle={{
                      ...mixins.buttonPrimary,
                      ...styles.copyButton
                    }}
                    containerStyle={{
                      ...mixins.buttonContainer,
                      ...styles.copyButtonContainer
                    }}
                    titleStyle={mixins.buttonTitle}
                    onPress={copyToClipboard}
                  />
                </View>

                <View style={styles.actions}>
                  <Button
                    title="Unshare"
                    buttonStyle={{
                      ...mixins.buttonIcon,
                      ...styles.actionButton
                    }}
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
                    buttonStyle={{
                      ...mixins.buttonIcon,
                      ...styles.actionButton
                    }}
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
                containerStyle={{
                  ...mixins.buttonIconContainer,
                  ...styles.createLinkButtonContainer
                }}
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
            )}

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
                    onPress={onSendCredential}
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

              {publicLink && (
                <View style={styles.bottomSection} onLayout={onQRCodeLayout}>
                  <Text style={mixins.paragraphText}>
                    You may also share the public link by having another person
                    scan this QR code.
                  </Text>
                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrCode}>
                      <QRCode
                        value={publicLink}
                        size={200}
                        getRef={(ref) => (qrCodeRef.current = ref)}
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
  )
}
