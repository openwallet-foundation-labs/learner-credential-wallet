export type ConfirmModalDisplayProps = {
  confirmButtonDisabled?: boolean
  confirmButton?: boolean
  cancelButton?: boolean

  title?: string
  confirmText?: string
  cancelText?: string

  cancelOnBackgroundPress?: boolean
  accessibilityFocusContent?: boolean
}

export type ConfirmModalProps = React.PropsWithChildren<
  ConfirmModalDisplayProps & {
    open?: boolean
    onRequestClose?: () => void
    onConfirm?: () => void
    onCancel?: () => void
  }
>
