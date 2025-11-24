import {
  ParsedWalletContents,
  WalletContent,
  UnlockedWallet
} from '../types/wallet'
import { ProfileMetadata } from '../types/profile'
import {
  IDidDocument,
  IKeyPair,
  IVerifiableCredential
} from '@digitalcredentials/ssi'

function isCredential(item: WalletContent): item is IVerifiableCredential {
  const context = (item as IVerifiableCredential)['@context']
  return (
    context?.includes('https://www.w3.org/2018/credentials/v1') ||
    context?.includes('https://www.w3.org/ns/credentials/v2')
  )
}

function isDidDocument(item: WalletContent): item is IDidDocument {
  return (item as IDidDocument)['@context']?.includes(
    'https://www.w3.org/ns/did/v1'
  )
}

function isVerificationKey(item: WalletContent): item is IKeyPair {
  return (item as IKeyPair)?.type === 'Ed25519VerificationKey2020'
}

function isKeyAgreementKey(item: WalletContent): item is IKeyPair {
  return (item as IKeyPair)?.type === 'X25519KeyAgreementKey2020'
}

function isProfileMetadata(item: WalletContent): item is ProfileMetadata {
  return (item as ProfileMetadata)?.type === 'ProfileMetadata'
}

/**
 * The Unlocked Wallet spec doesn't have a good way to differentiate
 * between wallet content types so this function identifies them based
 * on object shape.
 */
export function parseWalletContents(rawWallet: string): ParsedWalletContents {
  const { contents }: UnlockedWallet = JSON.parse(rawWallet)

  const credentials = contents.filter(isCredential)
  const didDocument = contents.find(isDidDocument)
  const verificationKey = contents.find(isVerificationKey)
  const keyAgreementKey = contents.find(isKeyAgreementKey)
  const profileMetadata = contents.find(isProfileMetadata)

  const errorMessage = (key: string) =>
    `Unable to parse wallet contents. Missing ${key}`
  if (didDocument === undefined) throw new Error(errorMessage('didDocument'))
  if (verificationKey === undefined)
    throw new Error(errorMessage('verificationKey'))
  if (keyAgreementKey === undefined)
    throw new Error(errorMessage('keyAgreementKey'))

  return {
    credentials,
    didDocument,
    verificationKey,
    keyAgreementKey,
    profileMetadata
  }
}
