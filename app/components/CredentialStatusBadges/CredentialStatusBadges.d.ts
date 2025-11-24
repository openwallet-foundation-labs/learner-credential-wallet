import { CredentialRecordRaw } from '../../model'
import { VerificationResult } from '../../lib/verifiableObject'
import { Color } from '../../styles'

export type CredentialStatusBadgesProps = {
  rawCredentialRecord: CredentialRecordRaw
  badgeBackgroundColor: Color
  precomputedVerification?: VerificationResult
  precomputedPublic?: boolean
}
