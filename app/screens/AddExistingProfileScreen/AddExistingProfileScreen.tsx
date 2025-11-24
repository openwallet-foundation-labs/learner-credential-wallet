import React, { useRef } from 'react'
import { View, Text } from 'react-native'
import { Button } from 'react-native-elements'
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'

import { NavHeader, ImportFileModal } from '../../components'

import dynamicStyleSheet from './AddExistingProfileScreen.styles'
import { AddExistingProfileScreenProps } from './AddExistingProfileScreen.d'
import { ProfileRecord } from '../../model'
import { importProfileFrom, ReportDetails } from '../../lib/import'
import { HumanReadableError } from '../../lib/error'
import { useAppDispatch, useDynamicStyles } from '../../hooks'
import { getAllRecords } from '../../store'
import type { ImportFileModalHandle } from '../../components'
import { navigationRef } from '../../navigation/navigationRef'

export default function AddExistingProfileScreen({
  navigation
}: AddExistingProfileScreenProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet)
  const dispatch = useAppDispatch()
  const importModalRef = useRef<ImportFileModalHandle>(null)

  async function onReadQRCode(text: string) {
    try {
      await ProfileRecord.importProfileRecord(text)
      await dispatch(getAllRecords())
    } catch (err) {
      console.error(err)
      throw new HumanReadableError('Unable to import profile')
    }

    navigation.navigate('ManageProfilesScreen')
  }

  async function importProfile(data: string) {
    const reportDetails = await importProfileFrom(data)
    await dispatch(getAllRecords())

    return reportDetails
  }

  function onPressRestoreFromFile() {
    importModalRef.current?.doImport()
  }

  function onPressScanQRCode() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('QRScreen', {
        onReadQRCode,
        instructionText:
          'Scan a shared valid QR code to add an existing profile.'
      })
    }
  }

  function onPressDetails(reportDetails: ReportDetails) {
    navigation.navigate('DetailsScreen', {
      header: 'Existing Profile Details',
      details: reportDetails,
      goBack: () => navigation.navigate('ManageProfilesScreen')
    })
  }

  function goToManageProfiles() {
    navigation.navigate('ManageProfilesScreen')
  }

  return (
    <>
      <NavHeader title="Add Existing Profile" goBack={navigation.goBack} />
      <View style={styles.container}>
        <Text style={styles.paragraph}>
          To add an existing profile, scan a valid QR code or upload a wallet
          file (.json) from your device.
        </Text>
        <Button
          title="Scan QR code"
          buttonStyle={mixins.buttonIcon}
          containerStyle={mixins.buttonContainerVertical}
          titleStyle={mixins.buttonIconTitle}
          iconRight
          onPress={onPressScanQRCode}
          icon={
            <MaterialIcons
              name="qr-code-scanner"
              size={theme.iconSize}
              color={theme.color.iconInactive}
            />
          }
        />
        <Button
          title="Restore from a file"
          buttonStyle={mixins.buttonIcon}
          containerStyle={mixins.buttonContainerVertical}
          titleStyle={mixins.buttonIconTitle}
          iconRight
          onPress={onPressRestoreFromFile}
          icon={
            <MaterialCommunityIcons
              name="file-upload"
              size={theme.iconSize}
              color={theme.color.iconInactive}
            />
          }
        />
      </View>
      <ImportFileModal
        ref={importModalRef}
        onPressDetails={onPressDetails}
        importItem={importProfile}
        onFinished={goToManageProfiles}
        textConfig={restoreProfileTextConfig}
      />
    </>
  )
}

const restoreProfileTextConfig = {
  loadingTitle: 'Adding Existing Profile',
  lockedTitle: 'Profile Locked',
  lockedBody: 'Enter the correct password to add this profile to your wallet.',
  finishedTitle: 'Existing Profile Added',
  finishedButton: 'Close',
  errorBody: 'The profile could not be added to your wallet.'
}
