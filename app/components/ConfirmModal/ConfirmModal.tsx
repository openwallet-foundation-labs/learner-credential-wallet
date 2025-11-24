import React, { useEffect, useState } from 'react'
import {
  Modal,
  Text,
  View,
  TouchableWithoutFeedback,
  AccessibilityInfo
} from 'react-native'
import { Button } from 'react-native-elements'

import { useAccessibilityFocus, useDynamicStyles } from '../../hooks'
import { ConfirmModalProps } from './ConfirmModal.d'

import dynamicStyleSheet from './ConfirmModal.style'

/**
 * TODO: Right now the accessibility focus throws errors on Android
 * when returning from the share UI. Those errors must be resolved before
 * this can be enabled. This disable flag is a temporary fix.
 */
const ENABLE_ACCESSIBILITY_FOCUS = false

export default function ConfirmModal({
  open = true,
  onRequestClose = () => {},
  onConfirm = () => {},
  onCancel = () => {},
  title,
  confirmButtonDisabled,
  confirmButton = true,
  cancelButton = true,
  cancelOnBackgroundPress = false,
  accessibilityFocusContent = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children
}: ConfirmModalProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)

  const [isFirstRender, setIsFirstRender] = useState(true)
  const [titleRef, focusTitle] = useAccessibilityFocus<Text>()
  const [contentRef, focusContent] = useAccessibilityFocus<View>()

  useEffect(() => {
    if (!isFirstRender) {
      AccessibilityInfo.announceForAccessibility(
        `Modal ${open ? 'open' : 'closed'}`
      )
    } else {
      setIsFirstRender(false)
    }
  }, [open])

  function onContentLayout() {
    if (ENABLE_ACCESSIBILITY_FOCUS) {
      accessibilityFocusContent ? focusContent() : focusTitle()
    }
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={open}
      onRequestClose={onRequestClose}
      accessibilityViewIsModal={true}
      accessible={false}
    >
      <View style={styles.modalOuterContainer}>
        <TouchableWithoutFeedback
          accessible={false}
          importantForAccessibility="no"
          onPress={() => {
            if (cancelOnBackgroundPress) {
              onRequestClose()
              onCancel()
            }
          }}
        >
          <View style={styles.modalBackground} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <Text
            style={styles.modalTitle}
            ref={titleRef}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <View ref={contentRef} onLayout={onContentLayout}>
            {children}
          </View>
          <View style={[mixins.buttonGroup, styles.buttonGroupContainer]}>
            {cancelButton ? (
              <Button
                buttonStyle={styles.buttonSecondary}
                containerStyle={mixins.buttonContainer}
                titleStyle={styles.buttonSecondaryTitle}
                title={cancelText}
                onPress={() => {
                  onRequestClose()
                  onCancel()
                }}
              />
            ) : null}
            {cancelButton && confirmButton ? (
              <View style={mixins.buttonSeparator} />
            ) : null}
            {confirmButton ? (
              <Button
                buttonStyle={styles.buttonPrimary}
                containerStyle={mixins.buttonContainer}
                titleStyle={mixins.buttonTitle}
                title={confirmText}
                disabled={confirmButtonDisabled}
                disabledStyle={mixins.buttonDisabled}
                disabledTitleStyle={mixins.buttonTitle}
                onPress={onConfirm}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  )
}
