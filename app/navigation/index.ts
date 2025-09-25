// Navigation Components - removed to break cycles
// Components should be imported directly

// Type Definitions
export * from './RootNavigation/RootNavigation.d';
export * from './HomeNavigation/HomeNavigation.d';
export * from './SettingsNavigation/SettingsNavigation.d';
export * from './SetupNavigation/SetupNavigation.d';
export * from './AddNavigation/AddNavigation.d';
export * from './AcceptCredentialsNavigation/AcceptCredentialsNavigation.d';
export * from './CredentialNavigation/CredentialNavigation.d';
export * from './ShareNavigation/ShareNavigation.d';
export * from './ExchangeCredentialsNavigation/ExchangeCredentialsNavigation.d';

export { navigationRef } from './navigationRef';

// Remove component re-exports to break cycles - import directly instead

/**
 * If screens are re-used, we need to make union types for their
 * props
 */
import { CredentialScreenHomeProps } from './CredentialNavigation/CredentialNavigation.d';
import { CredentialScreenShareProps } from './ShareNavigation/ShareNavigation.d';
export type CredentialScreenProps = CredentialScreenHomeProps | CredentialScreenShareProps;

import { DetailsScreenSettingsProps } from './SettingsNavigation/SettingsNavigation.d';
import { DetailsScreenSetupProps } from './SetupNavigation/SetupNavigation.d';
export type DetailsScreenProps = DetailsScreenSettingsProps | DetailsScreenSetupProps;

import { PublicLinkScreenCredentialProps } from './CredentialNavigation/CredentialNavigation.d';
import { PublicLinkScreenShareProps } from './ShareNavigation/ShareNavigation.d';
export type PublicLinkScreenProps = PublicLinkScreenCredentialProps | PublicLinkScreenShareProps;

import { IssuerInfoScreenCredentialProps } from './CredentialNavigation/CredentialNavigation.d';
import { IssuerInfoScreenAddProps } from './AcceptCredentialsNavigation/AcceptCredentialsNavigation.d';
export type IssuerInfoScreenProps = IssuerInfoScreenCredentialProps | IssuerInfoScreenAddProps;
