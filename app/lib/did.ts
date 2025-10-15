import * as DidMethodKey from '@digitalcredentials/did-method-key';
import { generateSecureRandom } from 'react-native-securerandom';
import { CredentialRecordRaw } from '../types/credential';
import { IDidDocument, IKeyPair, ISigner } from '@digitalcredentials/ssi';

const didKeyDriver = DidMethodKey.driver();

export type AddDidRecordParams = {
  didDocument: IDidDocument;
  verificationKey: IKeyPair;
  keyAgreementKey: IKeyPair;
};

export async function mintDid(): Promise<AddDidRecordParams> {
  const { didDocument, keyPairs } = await didKeyDriver.generate({
    randomBytes: await generateSecureRandom(32),
  });

  const expandedMap: [string, IKeyPair][] = Array.from(keyPairs);

  const [
    verificationKey,
    keyAgreementKey,
  ]: IKeyPair[] = expandedMap.map(([, pair]): IKeyPair => pair);

  return { didDocument, verificationKey, keyAgreementKey };
}

export interface IProfileSigners {
  authentication: ISigner;
  assertion: ISigner;
  zcapDelegation: ISigner;
  zcapInvocation: ISigner;
}

export interface ISelectedProfile {
  did: string;
  name: string;
  signers: IProfileSigners;
  loadCredentials: () => Promise<CredentialRecordRaw[]>
}

