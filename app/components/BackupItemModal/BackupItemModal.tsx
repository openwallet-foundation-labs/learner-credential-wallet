import React from 'react'
import { Text } from 'react-native'
import ConfirmModal from '../ConfirmModal/ConfirmModal'
import LoadingIndicatorDots from '../LoadingIndicatorDots/LoadingIndicatorDots'
import { useAsyncCallback } from 'react-async-hook'
import dynamicStyleSheet from './BackupItemModal.styles'
import { BackupItemModalProps } from './BackupItemModal.d'
import { useDynamicStyles } from '../../hooks'

export default function BackupItemModal({
  onRequestClose,
  open,
  onBackup,
  backupItemName,
  backupModalText
}: BackupItemModalProps): React.ReactElement {
  const { mixins } = useDynamicStyles(dynamicStyleSheet)
  const createBackup = useAsyncCallback(() => onBackup(), {
    onSuccess: onRequestClose,
    onError: onRequestClose
  })

  if (createBackup.loading) {
    return (
      <ConfirmModal
        title={`Backing Up Your ${backupItemName}`}
        confirmButton={false}
        cancelButton={false}
      >
        <>
          <Text style={mixins.modalBodyText}>
            This will only take a moment.
          </Text>
          <LoadingIndicatorDots />
        </>
      </ConfirmModal>
    )
  }

  return (
    <ConfirmModal
      open={open}
      onCancel={onRequestClose}
      onConfirm={createBackup.execute}
      title={`Backup ${backupItemName}`}
      cancelText="Cancel"
      confirmText="Create Backup"
    >
      <Text style={mixins.modalBodyText}>{backupModalText}</Text>
    </ConfirmModal>
  )
}
