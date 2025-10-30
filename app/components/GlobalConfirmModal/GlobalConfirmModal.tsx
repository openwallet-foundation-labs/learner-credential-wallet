import React from 'react';
import { useSelector } from 'react-redux';
import { Text } from 'react-native';

import { useDynamicStyles } from '../../hooks';
import { selectWalletState } from '../../store/slices/wallet';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { clearGlobalModal } from '../../lib/globalModal';

export default function GlobalConfirmModal(): React.ReactElement | null {
  const { mixins } = useDynamicStyles();
  const { globalModal } = useSelector(selectWalletState);
  const { body, onConfirm, onCancel, ...confirmModalDisplayProps } = globalModal || {};

  const hasContent = Boolean((confirmModalDisplayProps as any)?.title) || Boolean(body);
  const isModalOpen = globalModal !== null && hasContent;
  const isBodyText = typeof body === 'string';

  function onRequestClose(): void {
    clearGlobalModal();
  }

  // Ensure pressing any action button dismisses the modal first, then triggers callbacks
  function handleConfirm(): void {
    clearGlobalModal();
    if (onConfirm) onConfirm();
  }

  function handleCancel(): void {
    clearGlobalModal();
    if (onCancel) onCancel();
  }

  if (!hasContent) {
    // Defensive: if a modal was triggered without any content, do not render it
    if (globalModal !== null) clearGlobalModal();
    return null;
  }

  return (
    <ConfirmModal
      open={isModalOpen}
      onRequestClose={onRequestClose}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      {...confirmModalDisplayProps}
    >
      {isBodyText ? <Text style={mixins.modalBodyText}>{body}</Text> : body}
    </ConfirmModal>
  );
}
