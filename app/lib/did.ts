import * as DidMethodKey from '@digitalcredentials/did-method-key';
import { generateSecureRandom } from 'react-native-securerandom';
import { AddDidRecordParams } from '../model/did';
import { CredentialRecordRaw } from '../types/credential';
import { DidKey } from '../types/did';
import { ISigner } from '@digitalcredentials/ssi';

const didKeyDriver = DidMethodKey.driver();

export async function mintDid(): Promise<AddDidRecordParams> {
  const { didDocument, keyPairs } = await didKeyDriver.generate({
    randomBytes: await generateSecureRandom(32),
  });

  const expandedMap: [string, DidKey][] = Array.from(keyPairs);

  const [
    verificationKey,
    keyAgreementKey,
  ]: DidKey[] = expandedMap.map(([, pair]): DidKey => pair);

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

