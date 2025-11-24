import type { VerifyPayload } from '../../lib/verifiableObject'
import { Credential } from '../../types/credential'

export type VerificationStatusCardProps = {
  credential: Credential
  verifyPayload: VerifyPayload
}

export type StatusItemProps = {
  positiveText: string
  negativeText: string
  verified: boolean
  children?: React.ReactNode
}
