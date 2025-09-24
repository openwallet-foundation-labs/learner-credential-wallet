import type { Proof, Issuer } from './credential';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

export type VerifiablePresentation = {
  readonly '@context': string[];
  readonly issuer?: Issuer;
  readonly type: string;
  readonly verifiableCredential: IVerifiableCredential | IVerifiableCredential[];
  readonly proof?: Proof;
}

export enum PresentationError {
  IsNotVerified = 'Presentation is not verified.',
  CouldNotBeVerified = 'Presentation encoded could not be checked for verification and may be malformed.',
}
