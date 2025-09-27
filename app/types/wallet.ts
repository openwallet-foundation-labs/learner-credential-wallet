import { DidDocument, DidKey } from './did';
import { ProfileMetadata } from './profile';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

export type WalletContent = IVerifiableCredential | DidDocument | DidKey | ProfileMetadata;

export type ParsedWalletContents = {
  credentials: IVerifiableCredential[];
  didDocument: DidDocument;
  verificationKey: DidKey;
  keyAgreementKey: DidKey;
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
