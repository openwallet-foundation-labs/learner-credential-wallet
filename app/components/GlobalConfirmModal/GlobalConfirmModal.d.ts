import { ConfirmModalProps } from '..'

type GlobalModalProps = {
  body?: string | React.ReactNode
}

export type DisplayGlobalModalPayload = ConfirmModalProps & GlobalModalProps
export type GlobalModalPayload = ConfirmModalProps & GlobalModalProps
