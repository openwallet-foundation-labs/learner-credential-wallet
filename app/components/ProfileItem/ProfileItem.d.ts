import { ProfileWithCredentialRecords } from '../../model'

export type ProfileItemProps = {
  rawProfileRecord: ProfileWithCredentialRecords
}

export type ActionModalProps = {
  rawProfileRecord: ProfileWithCredentialRecords
  onRequestClose: () => void
}
