import * as DidMethodKey from '@digitalcredentials/did-method-key'
import {
  IDidDocument,
  ISigner,
  IVerificationKeyPair2020,
  IKeyAgreementKeyPair2020
} from '@digitalcredentials/ssi'
import { X25519KeyAgreementKey2020 } from '@digitalcredentials/x25519-key-agreement-key-2020'
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020'

import { CredentialRecordRaw } from '../types/credential'

export type AddDidRecordParams = {
  didDocument: IDidDocument
  verificationKey: IVerificationKeyPair2020
  keyAgreementKey: IKeyAgreementKeyPair2020
}

/**
 * Generates a new DID Document from a new key pair (used when creating a
 * new profile).
 */
export async function mintDid({
  seed
}: {
  seed: Uint8Array
}): Promise<AddDidRecordParams> {
  const didKeyDriver = DidMethodKey.driver()
  didKeyDriver.use({
    multibaseMultikeyHeader: 'z6Mk',
    fromMultibase: Ed25519VerificationKey2020.from
  })

  const verificationKeyPair = await Ed25519VerificationKey2020.generate({
    seed
  })

  const { didDocument } = await didKeyDriver.fromKeyPair({
    verificationKeyPair
  })

  // Note: did-method-key lib changed its signature; it used to export a map
  // of public-private key pairs, now it just exports public keys.
  // Due to that, we have to create key pairs manually here.
  const did = didDocument.id
  verificationKeyPair.controller = did
  verificationKeyPair.id = `${did}#${verificationKeyPair.fingerprint()}`
  const keyAgreementKeyPair =
    X25519KeyAgreementKey2020.fromEd25519VerificationKey2020({
      keyPair: verificationKeyPair
    })
  keyAgreementKeyPair.controller = did
  keyAgreementKeyPair.id = `${did}#${keyAgreementKeyPair.fingerprint()}`

  return {
    didDocument,
    verificationKey: verificationKeyPair.export({
      publicKey: true,
      privateKey: true
    }) as IVerificationKeyPair2020,
    keyAgreementKey: keyAgreementKeyPair.export({
      publicKey: true,
      privateKey: true
    }) as IKeyAgreementKeyPair2020
  }
}

export interface IProfileSigners {
  authentication: ISigner
  assertion: ISigner
  zcapDelegation: ISigner
  zcapInvocation: ISigner
}

export interface ISelectedProfile {
  did: string
  name: string
  signers: IProfileSigners
  loadCredentials: () => Promise<CredentialRecordRaw[]>
}
