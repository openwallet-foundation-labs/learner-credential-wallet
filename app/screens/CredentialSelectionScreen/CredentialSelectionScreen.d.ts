import type { CredentialRecordRaw } from '../../model/credential'
export type { ShareHomeScreenProps } from '../../navigation'

export type RenderItemProps = {
  item: CredentialRecordRaw
  index: number
}

export type CredentialSelectionScreenParams = {
  title: string
  instructionText: string
  credentialFilter?: (rawCredentialRecord: CredentialRecordRaw) => boolean
  singleSelect?: boolean
  onSelectCredentials: (selectedCredentials: CredentialRecordRaw[]) => void
  goBack?: () => void
  isVPRFlow?: boolean
}
