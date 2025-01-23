import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {  CheckBox } from 'react-native-elements';
import { ConfirmModal, LoadingIndicatorDots, PasswordForm } from '..';

import { TouchableOpacity } from 'react-native';
import { useAsyncCallback } from 'react-async-hook';

import dynamicStyleSheet from './BackupItemModal.styles';
import { BackupItemModalProps } from './BackupItemModal.d';
import { useDynamicStyles } from '../../hooks';


export default function BackupItemModal({ onRequestClose, open, onBackup, backupItemName, backupModalText }: BackupItemModalProps): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState<string>();

  const createBackup = useAsyncCallback(
    () => onBackup(),
    { onSuccess: onRequestClose, onError: onRequestClose }
  );

  const readyToBackup = !(enablePassword && !password);

  if (createBackup.loading) {
    return <ConfirmModal
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
    </ConfirmModal>;
  }

  return (
    <ConfirmModal
      open={open}
      onCancel={onRequestClose}
      onConfirm={createBackup.execute}
      title={`Backup ${backupItemName}`}
      cancelText="Cancel"
      confirmText="Create Backup"
      confirmButtonDisabled={!readyToBackup}
    >
      <Text style={mixins.modalBodyText}>
        {backupModalText}
      </Text>
    </ConfirmModal>
  );
}
