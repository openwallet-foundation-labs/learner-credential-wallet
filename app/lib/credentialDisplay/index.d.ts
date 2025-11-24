import { Credential } from '../../types/credential'
import type { CredentialCardProps } from '../../components/CredentialCard/CredentialCard.d'

export { CredentialCardProps }

export type ResolvedCredentialItemProps = {
  title: string | null
  subtitle: string | null
  image: string | null
}

export type CredentialDisplayConfig = {
  credentialType: string
  cardComponent: React.ComponentType<CredentialCardProps>
  itemPropsResolver: (credential: Credential) => ResolvedCredentialItemProps
}
