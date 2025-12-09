import React, { useMemo, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FlatList, View, Text } from 'react-native'
import { Button } from 'react-native-elements'
import { useFocusEffect } from '@react-navigation/native'

import { navigationRef } from '../../navigation/navigationRef'
import {
  acceptPendingCredentials,
  ApprovalStatus,
  clearFoyer,
  selectPendingCredentials,
  setCredentialApproval
} from '../../store/slices/credentialFoyer'
import { CredentialRecord } from '../../model/credential'
import { credentialContentHash } from '../../lib/credentialHash'
import CredentialItem from '../../components/CredentialItem/CredentialItem'
import NavHeader from '../../components/NavHeader/NavHeader'
import CredentialRequestHandler from '../../components/CredentialRequestHandler/CredentialRequestHandler'
import ApprovalControls from '../../components/ApprovalControls/ApprovalControls'
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal'
import {
  ApproveCredentialsScreenProps,
  RenderItemProps
} from './ApproveCredentialsScreen.d'
import dynamicStyleSheet from './ApproveCredentialsScreen.styles'
import { useAppDispatch, useDynamicStyles } from '../../hooks'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ApproveCredentialsScreen({
  navigation,
  route
}: ApproveCredentialsScreenProps): React.ReactElement {
  const { mixins, styles } = useDynamicStyles(dynamicStyleSheet)

  const dispatch = useAppDispatch()
  const { rawProfileRecord, credentialRequestParams, canGoBack } = route.params
  const profileRecordId = rawProfileRecord._id

  const displayedCredentials = useSelector(selectPendingCredentials)
  const pendingCredentials = useMemo(
    () =>
      displayedCredentials.filter(
        ({ status }) =>
          status === ApprovalStatus.Pending ||
          status === ApprovalStatus.PendingDuplicate
      ),
    [displayedCredentials]
  )

  const [modalIsOpen, setModalIsOpen] = useState(false)
  const acceptableCredentials = useMemo(
    () =>
      pendingCredentials.filter(
        ({ status }) => status === ApprovalStatus.Pending
      ),
    [pendingCredentials]
  )
  const showAcceptAllButton = acceptableCredentials.length > 0
  const acceptButtonText =
    acceptableCredentials.length === 1 ? 'Accept' : 'Accept All'

  const handleGoBack = React.useCallback(async () => {
    await dispatch(clearFoyer())
    navigationRef.navigate('HomeNavigation', {
      screen: 'SettingsNavigation',
      params: { screen: 'DeveloperScreen' }
    })
  }, [dispatch])

  useFocusEffect(
    React.useCallback(() => {
      const recheckDuplicates = async () => {
        const existingCredentialRecords =
          await CredentialRecord.getAllCredentialRecords()
        const existingHashesInProfile = existingCredentialRecords
          .filter(({ profileRecordId: pid }) => pid.equals(profileRecordId))
          .map(({ credential }) => credentialContentHash(credential))

        displayedCredentials.forEach((pendingCredential) => {
          const isDuplicate = existingHashesInProfile.includes(
            credentialContentHash(pendingCredential.credential)
          )
          if (
            isDuplicate &&
            pendingCredential.status === ApprovalStatus.Pending
          ) {
            dispatch(
              setCredentialApproval({
                ...pendingCredential,
                status: ApprovalStatus.PendingDuplicate
              })
            )
          } else if (
            !isDuplicate &&
            pendingCredential.status === ApprovalStatus.PendingDuplicate
          ) {
            dispatch(
              setCredentialApproval({
                ...pendingCredential,
                status: ApprovalStatus.Pending
              })
            )
          }
        })
      }
      recheckDuplicates()
    }, [displayedCredentials, profileRecordId, dispatch])
  )

  async function goToHome() {
    await dispatch(clearFoyer())
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'HomeScreen'
        }
      })
    }
  }

  async function acceptAllCredentials() {
    try {
      await dispatch(
        acceptPendingCredentials({
          pendingCredentials: acceptableCredentials,
          profileRecordId
        })
      )
      goToHome()
    } catch (err) {
      setModalIsOpen(true)
    }
  }

  function Done(): React.ReactElement {
    return (
      <Button
        buttonStyle={styles.doneButton}
        titleStyle={styles.doneButtonTitle}
        onPress={goToHome}
        title="Done"
      />
    )
  }

  const ListFooter = !showAcceptAllButton ? (
    <SafeAreaView edges={['bottom']} />
  ) : undefined

  function renderItem({ item: pendingCredential }: RenderItemProps) {
    const { credential } = pendingCredential
    const onSelect = () =>
      navigation.navigate('ApproveCredentialScreen', {
        pendingCredentialId: pendingCredential.id,
        profileRecordId
      })

    return (
      <CredentialItem
        credential={credential}
        onSelect={onSelect}
        bottomElement={
          <ApprovalControls
            pendingCredential={pendingCredential}
            profileRecordId={profileRecordId}
            profileName={rawProfileRecord.profileName}
          />
        }
        chevron
      />
    )
  }

  return (
    <>
      <NavHeader
        title="Available Credentials"
        goBack={canGoBack ? handleGoBack : undefined}
        rightComponent={<Done />}
      />
      <CredentialRequestHandler
        credentialRequestParams={credentialRequestParams}
        rawProfileRecord={rawProfileRecord}
        onFailed={goToHome}
      />
      <View style={styles.container}>
        <View style={styles.listHeader}>
          <Text style={styles.profileText}>
            <Text style={styles.profileTextBold}>Storing in Profile:</Text>{' '}
            {rawProfileRecord.profileName}
          </Text>
        </View>
        <FlatList
          style={styles.listContainer}
          contentContainerStyle={styles.listContentContainer}
          ListFooterComponent={ListFooter}
          data={displayedCredentials}
          renderItem={renderItem}
          keyExtractor={(_, index) => `credential-${index}`}
        />
      </View>
      {showAcceptAllButton && (
        <SafeAreaView style={styles.footerContainer} edges={['bottom']}>
          <Button
            containerStyle={mixins.buttonContainerVertical}
            buttonStyle={[
              mixins.button,
              mixins.buttonPrimary,
              styles.acceptAllButton
            ]}
            titleStyle={[mixins.buttonTitle, styles.acceptAllButtonTitle]}
            title={acceptButtonText}
            onPress={acceptAllCredentials}
          />
        </SafeAreaView>
      )}
      <ConfirmModal
        open={modalIsOpen}
        title="Unable To Add Credentials"
        onRequestClose={() => setModalIsOpen(false)}
        confirmText="Close"
        cancelButton={false}
      >
        <Text style={mixins.modalBodyText}>
          Some credentials were not able to be added to your wallet.
        </Text>
      </ConfirmModal>
    </>
  )
}
