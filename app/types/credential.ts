import { ObjectID } from 'bson';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

export enum CredentialError {
  IsNotVerified = 'Credential is not verified.',
  CouldNotBeVerified = 'Credential could not be checked for verification and may be malformed.',
  DidNotInRegistry = 'Could not find issuer in registry with given DID.',
}

export enum PresentationError {
  IsNotVerified = 'Presentation is not verified.',
  CouldNotBeVerified = 'Presentation encoded could not be checked for verification and may be malformed.',
}

export type CredentialImportReport = {
  success: string[];
  duplicate: string[];
  failed: string[];
}

/**
 * The DCC VC standard is in flux right now,
 * so we are choosing to store credentials as
 * stringified JSON.
 */
export type CredentialRecordEntry = {
  readonly _id: ObjectID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly rawCredential: string;
  readonly profileRecordId: ObjectID;
}
export type CredentialRecordRaw = CredentialRecordEntry & {
  readonly credential: IVerifiableCredential;
}

// Different types of queries in verifiable presentation request
export enum VcQueryType {
  Example = 'QueryByExample',
  Frame = 'QueryByFrame',
  DidAuth = 'DIDAuthentication',
  DidAuthLegacy = 'DIDAuth',
  ZcapQuery = 'ZcapQuery',
}
