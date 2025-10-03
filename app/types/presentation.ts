import type { Credential, Proof, Issuer } from './credential';

export type VerifiablePresentation = {
  readonly '@context': string[];
  readonly issuer?: Issuer;
  readonly type: string;
  readonly verifiableCredential: Credential | Credential[];
  readonly proof?: Proof;
}

export enum PresentationError {
  IsNotVerified = 'Presentation is not verified.',
  CouldNotBeVerified = 'Presentation encoded could not be checked for verification and may be malformed.',
}
