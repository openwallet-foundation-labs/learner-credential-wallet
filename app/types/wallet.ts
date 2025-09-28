import { ProfileMetadata } from './profile';
import { IDidDocument, IKeyPair, IVerifiableCredential } from '@digitalcredentials/ssi';

export type WalletContent = IVerifiableCredential | IDidDocument | IKeyPair | ProfileMetadata;

export type ParsedWalletContents = {
  credentials: IVerifiableCredential[];
  didDocument: IDidDocument;
  verificationKey: IKeyPair;
  keyAgreementKey: IKeyPair;
  profileMetadata?: ProfileMetadata;
};

export type UnlockedWallet = {
  readonly '@context': string[];
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly contents: WalletContent[];
}

export type JwePayload = {
  recipients: JwePayloadRecipient[];
  iv: string;
  ciphertext: string;
  tag: string;
}

type JwePayloadRecipient = {
  encrypted_key: string;
  header: {
    p2s: string;
    p2c: string;
  };
}
