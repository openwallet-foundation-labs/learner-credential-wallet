import React, { useRef } from 'react'
import { View, Text } from 'react-native'
import { Button } from 'react-native-elements'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { NavHeader, ImportFileModal } from '../../components'
import dynamicStyleSheet from './RestoreWalletScreen.styles'
import { RestoreWalletScreenProps } from './RestoreWalletScreen.d'
import { importWalletFrom, ReportDetails } from '../../lib/import'
import { useAppDispatch, useDynamicStyles } from '../../hooks'
import { getAllRecords } from '../../store'
import type { ImportFileModalHandle } from '../../components'

export default function RestoreWalletScreen({
  navigation
}: RestoreWalletScreenProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet)
  const importModalRef = useRef<ImportFileModalHandle>(null)
  const dispatch = useAppDispatch()

  async function importWallet(data: string) {
    const reportDetails = await importWalletFrom(data)
    await dispatch(getAllRecords())

    return reportDetails
  }

  function onPressRestoreFromFile() {
    importModalRef.current?.doImport()
  }

  function onPressDetails(reportDetails: ReportDetails) {
    navigation.navigate('DetailsScreen', {
      header: 'Restored Wallet Details',
      details: reportDetails
    })
  }

  function goToSettings() {
    navigation.navigate('Settings')
  }

  return (
    <>
      <NavHeader title="Restore" goBack={navigation.goBack} />
      <View style={styles.container}>
        <Text style={styles.paragraph}>
          Select a wallet file (.json) from your device to restore from.
        </Text>
        <Button
          title="Choose a file"
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
        importItem={importWallet}
        onFinished={goToSettings}
        textConfig={restoreWalletTextConfig}
      />
    </>
  )
}

const restoreWalletTextConfig = {
  loadingTitle: 'Restoring From File',
  lockedTitle: 'Wallet Locked',
  lockedBody: 'Enter the correct password restore this wallet.',
  finishedTitle: 'Restore Complete',
  finishedButton: 'Close',
  errorBody: 'The wallet could not be restored.'
}
