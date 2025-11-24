import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { TextInput } from 'react-native-paper'
import { Button } from 'react-native-elements'

import MoreMenuButton from '../MoreMenuButton/MoreMenuButton'
import MenuItem from '../MenuItem/MenuItem'
import ConfirmModal from '../ConfirmModal/ConfirmModal'
import BackupItemModal from '../BackupItemModal/BackupItemModal'
import dynamicStyleSheet from './ProfileItem.styles'
import { ActionModalProps, ProfileItemProps } from './ProfileItem.d'
import { navigationRef } from '../../navigation/navigationRef'
import { useAppDispatch, useDynamicStyles } from '../../hooks'
import { deleteProfile, updateProfile } from '../../store/slices/profile'
import { exportProfile } from '../../lib/export'
import { errorMessageFrom } from '../../lib/error'
import { fmtCredentialCount } from '../../lib/text'
import { getCredentialName } from '../../lib/credentialName'

enum ActiveModal {
  Rename,
  Delete,
  Backup
}

export default function ProfileItem({
  rawProfileRecord
}: ProfileItemProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null)

  function goToCredentials() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'SettingsNavigation',
        params: {
          screen: 'ProfileCredentialScreen',
          params: { rawProfileRecord }
        }
      })
    }
  }

  function goToSource() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('ViewSourceScreen', {
        data: JSON.stringify(rawProfileRecord, null, 2)
      })

      setActiveModal(null)
    }
  }

  const modalContent = useMemo(() => {
    if (activeModal === null) return null

    const actionProps = {
      rawProfileRecord,
      onRequestClose: () => setActiveModal(null)
    }

    return {
      [ActiveModal.Rename]: <RenameModal {...actionProps} />,
      [ActiveModal.Backup]: <BackupModal {...actionProps} />,
      [ActiveModal.Delete]: <DeleteModal {...actionProps} />
    }[activeModal]
  }, [activeModal])

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.textContainer}
          onPress={goToCredentials}
        >
          <Text style={styles.titleText}>{rawProfileRecord.profileName}</Text>
          <Text style={styles.subtitleText}>
            {fmtCredentialCount(rawProfileRecord.rawCredentialRecords.length)}
          </Text>
        </TouchableOpacity>
        <MoreMenuButton>
          <MenuItem
            title="Rename"
            onPress={() => setActiveModal(ActiveModal.Rename)}
          />
          <MenuItem
            title="Backup"
            onPress={() => setActiveModal(ActiveModal.Backup)}
          />
          <MenuItem title="View Source" onPress={goToSource} />
          <MenuItem
            title="Delete"
            onPress={() => setActiveModal(ActiveModal.Delete)}
          />
        </MoreMenuButton>
      </View>
      {modalContent}
    </>
  )
}

function RenameModal({
  rawProfileRecord,
  onRequestClose
}: ActionModalProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)
  const [newName, setNewName] = useState(rawProfileRecord.profileName)
  const [errorMessage, setErrorMessage] = useState('')
  const dispatch = useAppDispatch()

  async function onSave() {
    if (!newName) return
    try {
      await dispatch(
        updateProfile({ ...rawProfileRecord, profileName: newName })
      ).unwrap()
      setErrorMessage('')
      onRequestClose()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to rename profile')
    }
  }

  return (
    <ConfirmModal
      onRequestClose={onRequestClose}
      onConfirm={onSave}
      title="Rename Profile"
      cancelText="Cancel"
      confirmText="Save"
    >
      <TextInput
        value={newName}
        onChangeText={(text) => {
          setNewName(text)
          setErrorMessage('')
        }}
        style={styles.input}
        outlineColor={theme.color.textPrimary}
        selectionColor={theme.color.textPrimary}
        theme={{
          colors: {
            placeholder: newName
              ? theme.color.textPrimary
              : theme.color.inputInactive,
            text: theme.color.textPrimary,
            primary: theme.color.brightAccent
          }
        }}
        label="Profile Name"
        mode="outlined"
        keyboardAppearance="dark"
        onTextInput={() => {}}
        tvParallaxProperties={undefined}
      />
      {errorMessage ? (
        <Text style={{ color: theme.color.error }}>{errorMessage}</Text>
      ) : null}
    </ConfirmModal>
  )
}

function BackupModal({
  rawProfileRecord,
  onRequestClose
}: ActionModalProps): React.ReactElement {
  const backupProfile = () => exportProfile(rawProfileRecord)

  return (
    <BackupItemModal
      onRequestClose={onRequestClose}
      onBackup={backupProfile}
      backupItemName="Profile"
      backupModalText="This will backup your profile and its contents into a file for you to download."
    />
  )
}

function DeleteModal({
  rawProfileRecord,
  onRequestClose
}: ActionModalProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)
  const [errorMessage, setErrorMessage] = useState<string>()
  const dispatch = useAppDispatch()

  async function onDelete() {
    try {
      await dispatch(deleteProfile(rawProfileRecord))
      onRequestClose()
    } catch (err) {
      setErrorMessage(errorMessageFrom(err))
    }
  }

  function goToDetails() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'SettingsNavigation',
        params: {
          screen: 'DetailsScreen',
          params: {
            header: 'Delete Profile Details',
            details: {
              [`${rawProfileRecord.rawCredentialRecords.length} total credential`]:
                rawProfileRecord.rawCredentialRecords.map(({ credential }) =>
                  getCredentialName(credential)
                )
            }
          }
        }
      })

      onRequestClose()
    }
  }

  if (errorMessage) {
    return (
      <ConfirmModal
        onRequestClose={onRequestClose}
        cancelOnBackgroundPress
        title="Unable to Delete Profile"
        confirmText="Close"
        cancelButton={false}
      >
        <Text style={mixins.modalBodyText}>{errorMessage}</Text>
      </ConfirmModal>
    )
  }

  return (
    <ConfirmModal
      onCancel={onRequestClose}
      onConfirm={onDelete}
      title="Delete Profile"
      cancelText="Cancel"
      confirmText="Delete Profile"
    >
      <Text style={mixins.modalBodyText}>
        Are you sure you want to delete {rawProfileRecord.profileName} and its{' '}
        {fmtCredentialCount(rawProfileRecord.rawCredentialRecords.length)}?
      </Text>
      <Button
        buttonStyle={mixins.buttonClear}
        titleStyle={[mixins.buttonClearTitle, styles.underline]}
        containerStyle={mixins.buttonClearContainer}
        title="Details"
        onPress={goToDetails}
      />
    </ConfirmModal>
  )
}
