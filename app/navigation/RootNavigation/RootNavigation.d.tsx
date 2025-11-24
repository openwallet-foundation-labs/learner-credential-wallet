import type { NavigatorScreenParams } from '@react-navigation/native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { VerifyPayload } from '../../lib/verifiableObject'
import type {
  HomeNavigationParamList,
  AcceptCredentialsNavigationParamList,
  ExchangeCredentialsNavigationParamList
} from '..'
import { CredentialRecordRaw } from '../../types/credential'
import { ProfileRecordRaw } from '../../model'
import {
  CredentialSelectionScreenParams,
  ProfileSelectionScreenParams,
  QRScreenParams,
  ViewSourceScreenParams
} from '../../screens'
import { IVerifiableCredential } from '@digitalcredentials/ssi'

export type RootNavigationParamsList = {
  HomeNavigation: NavigatorScreenParams<HomeNavigationParamList>
  DebugScreen: {
    rawCredentialRecord: CredentialRecordRaw
    rawProfileRecord: ProfileRecordRaw
  }
  QRScreen: QRScreenParams
  VerificationStatusScreen: {
    credential: IVerifiableCredential
    verifyPayload: VerifyPayload
  }
  AcceptCredentialsNavigation: NavigatorScreenParams<AcceptCredentialsNavigationParamList>
  ExchangeCredentialsNavigation: NavigatorScreenParams<ExchangeCredentialsNavigationParamList>
  ProfileSelectionScreen: ProfileSelectionScreenParams
  CredentialSelectionScreen: CredentialSelectionScreenParams
  ViewSourceScreen: ViewSourceScreenParams
}

export type HomeNavigationProps = StackScreenProps<
  RootNavigationParamsList,
  'HomeNavigation'
>
export type DebugScreenProps = StackScreenProps<
  RootNavigationParamsList,
  'DebugScreen'
>
export type VerificationStatusScreenProps = StackScreenProps<
  RootNavigationParamsList,
  'VerificationStatusScreen'
>
export type AcceptCredentialsNavigationProps = StackScreenProps<
  RootNavigationParamsList,
  'AcceptCredentialsNavigation'
>
export type QRScreenProps = StackScreenProps<
  RootNavigationParamsList,
  'QRScreen'
>
export type ProfileSelectionScreenProps = StackScreenProps<
  RootNavigationParamsList,
  'ProfileSelectionScreen'
>
export type CredentialSelectionScreenProps = StackScreenProps<
  RootNavigationParamsList,
  'CredentialSelectionScreen'
>
export type ViewSourceScreenProps = StackScreenProps<
  RootNavigationParamsList,
  'ViewSourceScreen'
>
