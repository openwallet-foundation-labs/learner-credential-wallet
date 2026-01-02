import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  AccessibilityInfo
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useAppDispatch, useDynamicStyles } from '../../hooks'

//import { MenuItem, NavHeader, ConfirmModal, AccessibleView, VerificationCard, CredentialCard, VerificationStatusCard } from '../../components';
import {
  MenuItem,
  NavHeader,
  ConfirmModal,
  AccessibleView,
  CredentialCard,
  VerificationStatusCard
} from '../../components'
import type { CredentialScreenProps } from '../../navigation'
import { navigationRef } from '../../navigation/navigationRef'

import dynamicStyleSheet from './CredentialScreen.styles'
import { deleteCredential } from '../../store/slices/credential'
import { makeSelectProfileFromCredential } from '../../store/selectorFactories/makeSelectProfileFromCredential'
import { useSelectorFactory } from '../../hooks/useSelectorFactory'
import { PublicLinkScreenMode } from '../PublicLinkScreen/PublicLinkScreen'
import { credentialItemPropsFor } from '../../lib/credentialDisplay'
import { useVerifyCredential } from '../../hooks'

export default function CredentialScreen({
  navigation,
  route
}: CredentialScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)
  const dispatch = useAppDispatch()
  const [menuIsOpen, setMenuIsOpen] = useState(false)
  const [modalIsOpen, setModalIsOpen] = useState(false)

  const { rawCredentialRecord, noShishKabob = false } = route.params
  const { title } = credentialItemPropsFor(rawCredentialRecord.credential)

  const rawProfileRecord = useSelectorFactory(makeSelectProfileFromCredential, {
    rawCredentialRecord
  })
  //const { profileName } = rawProfileRecord;
  const verifyPayload = useVerifyCredential(rawCredentialRecord, true)

  function onPressShare() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'SettingsNavigation',
        params: {
          screen: 'PublicLinkScreen',
          params: {
            rawCredentialRecord,
            screenMode: PublicLinkScreenMode.ShareCredential
          }
        }
      })
    }
  }

  function goToIssuerInfo(issuerId: string) {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'IssuerInfoScreen',
          params: { issuerId, rawCredentialRecord }
        }
      })
    }
  }

  function onPressDebug() {
    setMenuIsOpen(false)
    if (navigationRef.isReady()) {
      navigationRef.navigate('DebugScreen', {
        rawCredentialRecord,
        rawProfileRecord
      })
    }
  }

  function onPressDelete() {
    setMenuIsOpen(false)
    setModalIsOpen(true)
  }

  async function onConfirmDelete() {
    dispatch(deleteCredential(rawCredentialRecord))
    AccessibilityInfo.announceForAccessibility('Credential Deleted')
    navigation.goBack()
  }

  function HeaderRightComponent(): React.ReactElement | null {
    if (noShishKabob) {
      return null
    }

    return (
      <AccessibleView
        label="More options"
        accessibilityRole="button"
        accessibilityState={{ expanded: menuIsOpen }}
        onPress={() => setMenuIsOpen(!menuIsOpen)}
        testID="credential-menu-button"
      >
        <MaterialIcons name="more-vert" style={mixins.headerIcon} />
      </AccessibleView>
    )
  }

  return (
    <>
      <NavHeader
        title="Credential Preview"
        testID="Credential Preview"
        goBack={() => navigation.goBack()}
        rightComponent={<HeaderRightComponent />}
      />
      <ConfirmModal
        open={modalIsOpen}
        onRequestClose={() => setModalIsOpen(!modalIsOpen)}
        onConfirm={onConfirmDelete}
        title="Delete Credential"
        confirmText="Delete"
        accessibilityFocusContent
      >
        <Text style={mixins.modalBodyText}>
          Are you sure you want to remove {title} from your wallet?
        </Text>
      </ConfirmModal>
      <View style={styles.outerContainer}>
        {menuIsOpen ? (
          <View style={styles.menuContainer} accessibilityViewIsModal={true}>
            <MenuItem icon="share" title="Share" onPress={onPressShare} />
            <MenuItem
              icon="info-outline"
              title="View Source"
              onPress={onPressDebug}
            />
            <MenuItem
              icon="delete"
              title="Delete"
              onPress={onPressDelete}
              testID="credential-delete-button"
            />
          </View>
        ) : null}
        <ScrollView
          onScrollEndDrag={() => setMenuIsOpen(false)}
          style={styles.scrollContainer}
          accessible={false}
          importantForAccessibility={menuIsOpen ? 'no-hide-descendants' : 'no'}
        >
          <TouchableWithoutFeedback
            onPress={() => setMenuIsOpen(false)}
            accessible={false}
            importantForAccessibility="no"
          >
            <View style={styles.container}>
              <CredentialCard
                rawCredentialRecord={rawCredentialRecord}
                onPressIssuer={goToIssuerInfo}
              />
              {/* <VerificationCard rawCredentialRecord={rawCredentialRecord} isButton showDetails={false}/> */}
              {verifyPayload && (
                <VerificationStatusCard
                  credential={rawCredentialRecord.credential}
                  verifyPayload={verifyPayload}
                />
              )}
              <View style={styles.profileContainer}>
                <Text style={mixins.paragraphText}>
                  {/* <Text style={styles.textBold}>Profile:</Text> {profileName} */}
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
    </>
  )
}
