import { CredentialRecord } from '../model/credential'
import { IProfileSigners, ISelectedProfile } from './did'
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020'
import { IDidDocument, IKeyPair } from '@digitalcredentials/ssi'

export async function signersFromKey(
  didKey: IKeyPair
): Promise<IProfileSigners> {
  const keyPair = await Ed25519VerificationKey2020.from(didKey)
  return {
    authentication: keyPair.signer(),
    assertion: keyPair.signer(),
    zcapDelegation: keyPair.signer(),
    zcapInvocation: keyPair.signer()
  } as IProfileSigners
}

export async function profileWithSigners({
  profileName,
  loadCredentials,
  didRecord: { didDocument, verificationKey }
}: {
  profileName: string
  loadCredentials: () => Promise<any>
  didRecord: { didDocument: IDidDocument; verificationKey: IKeyPair }
}): Promise<ISelectedProfile> {
  return {
    name: profileName,
    did: didDocument!.id,
    signers: await signersFromKey(verificationKey!),
    loadCredentials
  } as ISelectedProfile
}
