import { CredentialRecordRaw } from '../../model'
import { PublicLinkScreenMode } from './PublicLinkScreen'
// Avoid cycle by not re-exporting navigation types
// export { PublicLinkScreenProps };

export type PublicLinkScreenParams = {
  rawCredentialRecord: CredentialRecordRaw
  screenMode?: PublicLinkScreenMode
}
