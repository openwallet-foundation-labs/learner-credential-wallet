import { CredentialRecord, DidRecordRaw } from '../model';
import { IProfileSigners, ISelectedProfile } from './did';
import { DidKey } from '../types/did';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';

export async function signersFromKey(didKey: DidKey): Promise<IProfileSigners> {
  const keyPair = await Ed25519VerificationKey2020.from(didKey)
  return {
    authentication: keyPair.signer(),
    assertion: keyPair.signer(),
    zcapDelegation: keyPair.signer(),
    zcapInvocation: keyPair.signer()
  } as IProfileSigners
}

export async function profileWithSigners({ profileName, didRecord }:
  { profileName: string, didRecord: Partial<DidRecordRaw> }
): Promise<ISelectedProfile> {
  return {
    name: profileName,
    did: didRecord.didDocument!.id,
    signers: await signersFromKey(didRecord.verificationKey!),
    loadCredentials: CredentialRecord.getAllCredentialRecords
  } as ISelectedProfile;
}
