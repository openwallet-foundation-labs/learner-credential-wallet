import type { StackScreenProps } from '@react-navigation/stack'
import { IssuerInfoScreenParams, PublicLinkScreenParams } from '../../screens'
import { CredentialRecordRaw } from '../../types/credential'

export type CredentialNavigationParamList = {
  HomeScreen: undefined
  CredentialScreen: {
    rawCredentialRecord: CredentialRecordRaw
    noShishKabob?: boolean
  }
  ShareCredentialScreen: {
    rawCredentialRecord: CredentialRecordRaw
  }
  PublicLinkScreen: PublicLinkScreenParams
  IssuerInfoScreen: IssuerInfoScreenParams
}

export type HomeScreenProps = StackScreenProps<
  CredentialNavigationParamList,
  'HomeScreen'
>
export type CredentialScreenHomeProps = StackScreenProps<
  CredentialNavigationParamList,
  'CredentialScreen'
>
export type ShareCredentialScreenProps = StackScreenProps<
  CredentialNavigationParamList,
  'ShareCredentialScreen'
>
export type PublicLinkScreenCredentialProps = StackScreenProps<
  CredentialNavigationParamList,
  'PublicLinkScreen'
>
export type IssuerInfoScreenCredentialProps = StackScreenProps<
  CredentialNavigationParamList,
  'IssuerInfoScreen'
>
