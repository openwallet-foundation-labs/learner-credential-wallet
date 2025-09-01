import { DidAuthRequestParams } from '../lib/didAuthRequest';
import type { Credential } from './credential';
import { VerifiablePresentation } from './presentation';

export type ChapiCredentialResponse = {
  readonly credentialRequestOrigin?: string;
  readonly credential?: {
    readonly type: 'web';
    readonly dataType: 'VerifiableCredential' | 'VerifiablePresentation';
    readonly data: Credential | VerifiablePresentation;
  };
  readonly options?: {
    readonly recommendedHandlerOrigins?: string[];
  };
}

export type ChapiDidAuthRequest = {
  readonly credentialRequestOrigin?: string;
  readonly credentialRequestOptions?: {
    readonly web?: {
      readonly VerifiablePresentation?: DidAuthRequestParams;
    };
  };
}

export type ChapiCredentialRequestParams = {
  request: string;
}

export type VcApiCredentialRequest = {
  readonly credentialRequestOrigin?: string;
  readonly verifiablePresentationRequest?: any;
  readonly issueRequest?: any;
  readonly protocols?: {
    readonly OID4VCI?: string;
    readonly OID4VP?: string;
    readonly vcapi?: string;
  };
}
