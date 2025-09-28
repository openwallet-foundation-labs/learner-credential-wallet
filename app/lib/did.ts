import * as DidMethodKey from '@digitalcredentials/did-method-key';
import { generateSecureRandom } from 'react-native-securerandom';
import { AddDidRecordParams, CredentialRecord, CredentialRecordRaw, DidRecordRaw, ProfileRecordRaw } from '../model';
import { DidKey } from '../types/did';
import { ISigner } from '@digitalcredentials/ssi';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';

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

export async function profileWithSigners ({ rawProfileRecord, didRecord }:
  { rawProfileRecord : ProfileRecordRaw, didRecord: DidRecordRaw }
): Promise<ISelectedProfile> {
  return  {
    name: rawProfileRecord.profileName,
    did: didRecord.didDocument.id,
    signers: await signersFromKey(didRecord.verificationKey),
    loadCredentials: CredentialRecord.getAllCredentialRecords
  } as ISelectedProfile;
}

export async function signersFromKey (didKey: DidKey): Promise<IProfileSigners> {
  const keyPair = await Ed25519VerificationKey2020.from(didKey)
  return {
    authentication: keyPair.signer(),
    assertion: keyPair.signer(),
    zcapDelegation: keyPair.signer(),
    zcapInvocation: keyPair.signer()
  } as IProfileSigners
}
