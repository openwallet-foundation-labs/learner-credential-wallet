import React from 'react';
import { useSelector } from 'react-redux';
import { Text } from 'react-native';

import { useDynamicStyles } from '../../hooks';
import { selectWalletState } from '../../store/slices/wallet';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { clearGlobalModal } from '../../lib/globalModal';

export default function GlobalConfirmModal(): React.ReactElement {
  const { mixins } = useDynamicStyles();
  const { globalModal } = useSelector(selectWalletState);
  const { body, onConfirm, onCancel, ...confirmModalDisplayProps } = globalModal || {};

  const isModalOpen = globalModal !== null;
  const isBodyText = typeof body === 'string';

  function onRequestClose(): void {
    clearGlobalModal();
  }

  return (
    <ConfirmModal
      open={isModalOpen}
      onRequestClose={onRequestClose}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...confirmModalDisplayProps}
    >
      {isBodyText ? <Text style={mixins.modalBodyText}>{body}</Text> : body}
    </ConfirmModal>
  );
}
