import { DidAuthRequestParams } from '../lib/didAuthRequest';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';

export type ChapiCredentialResponse = {
  readonly credentialRequestOrigin?: string;
  readonly credential?: {
    readonly type: 'web';
    readonly dataType: 'VerifiableCredential' | 'VerifiablePresentation';
    readonly data: IVerifiableCredential | IVerifiablePresentation;
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
