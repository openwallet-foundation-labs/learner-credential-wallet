import uuid from 'react-native-uuid';
import * as vc from '@digitalcredentials/vc';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';

import type { DidRecordRaw } from '../model/did';

import { securityLoader } from '@digitalcredentials/security-document-loader';
import { shareData } from './shareData';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();

type SignPresentationParams = {
  didRecord: DidRecordRaw;
  verifiableCredential?: IVerifiableCredential[] | IVerifiableCredential;
  challenge?: string;
}

/**
 * Creates a Verifiable Presentation, signed with the provided DID record.
 * If one or more VCs are provided, they're included in the presentation.
 * (An "empty" VP, without any VCs, is used for DID Authentication.)
 *
 * A challenge (called a 'nonce' in some protocols) is optionally used when a
 * Relying Party (RP/requester) is requesting one or more VCs, to prevent
 * replay attacks.
 */
export async function createVerifiablePresentation({
  didRecord, verifiableCredential, challenge = uuid.v4() as string,
}: SignPresentationParams): Promise<IVerifiablePresentation> {
  const verificationKeyPair = await Ed25519VerificationKey2020.from(didRecord.verificationKey);
  const suite = new Ed25519Signature2020({ key: verificationKeyPair });

  const holder = didRecord.didDocument.id;
  
  // Create presentation - will throw error if credential is expired
  let presentation;
  try {
    presentation = vc.createPresentation({ verifiableCredential, holder });
  } catch (error) {
    // If expired, create presentation manually to bypass validation
    if (error instanceof Error && error.message.includes('validUntil')) {
      console.log('[present.ts] Bypassing expiration check for presentation creation');
      presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder,
        verifiableCredential: Array.isArray(verifiableCredential) ? verifiableCredential : [verifiableCredential]
      };
    } else {
      throw error;
    }
  }

  return await vc.signPresentation({
    presentation,
    suite,
    challenge,
    documentLoader,
  });
}

export function createUnsignedPresentation(verifiableCredential: IVerifiableCredential[] | IVerifiableCredential): IVerifiablePresentation {
  // Create presentation - will throw error if credential is expired
  try {
    return vc.createPresentation({ verifiableCredential });
  } catch (error) {
    // If expired, create presentation manually to bypass validation
    if (error instanceof Error && error.message.includes('validUntil')) {
      console.log('[present.ts] Bypassing expiration check for unsigned presentation creation');
      return {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: Array.isArray(verifiableCredential) ? verifiableCredential : [verifiableCredential]
      } as any as IVerifiablePresentation;
    }
    throw error;
  }
}

export async function sharePresentation(verifiablePresentation: IVerifiablePresentation): Promise<void> {
  const { verifiableCredential } = verifiablePresentation;
  const plurality = verifiableCredential instanceof Array && verifiableCredential.length > 1 ? 's' : '';

  const verifiablePresentationString = JSON.stringify(verifiablePresentation, null, 2);

  await shareData(`SharedCredential${plurality}.txt`, verifiablePresentationString);
}
