import { ProfileRecordRaw } from '../../model'

export type { ProfileSelectionScreenProps } from '../../navigation'

export type ProfileButtonProps = {
  rawProfileRecord: ProfileRecordRaw
  onPress: () => void
}

export type ProfileSelectionScreenParams = {
  onSelectProfile: (rawProfileRecord: ProfileRecordRaw) => void
  instructionText?: string
  goBack?: () => void
}
