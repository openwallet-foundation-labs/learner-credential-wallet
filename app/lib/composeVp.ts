import { ISelectedProfile } from './did';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';
import * as vc from '@digitalcredentials/vc';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { securityLoader } from '@digitalcredentials/security-document-loader';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();

/**
 * Creates a Verifiable Presentation, to send back to the
 * requester (an Exchanger instance).
 * The VP is signed if DID Auth was requested, and unsigned otherwise.
 */
export async function composeVp(
  { selectedProfile, selectedVcs = [], challenge, domain, didAuthRequested }:
    {
      selectedProfile: ISelectedProfile, selectedVcs?: IVerifiableCredential[],
      challenge?: string, domain?: string, didAuthRequested: boolean
    }
): Promise<IVerifiablePresentation> {
  if (!didAuthRequested && selectedVcs!.length === 0) {
    throw new Error('A VP requires either credentials or a DID Auth request.');
  }
  if (didAuthRequested && !(challenge && domain)) {
    throw new Error('Both "challenge" and "domain" are required for DID Auth.');
  }

  if (!didAuthRequested) {
    // Return an unsigned VP
    // Create presentation - will throw error if credential is expired
    try {
      return await vc.createPresentation({ verifiableCredential: selectedVcs, verify: false });
    } catch (error) {
      // If expired, create presentation manually to bypass validation
      if (error instanceof Error && error.message.includes('validUntil')) {
        console.log('[composeVp.ts] Bypassing expiration check for unsigned VP creation');
        return {
          '@context': ['https://www.w3.org/2018/credentials/v1'],
          type: ['VerifiablePresentation'],
          verifiableCredential: selectedVcs
        } as any as IVerifiablePresentation;
      }
      throw error;
    }
  }

  // Return a signed VP
  // Create presentation - will throw error if credential is expired
  let presentation;
  try {
    presentation = await vc.createPresentation({
      holder: selectedProfile.did,
      verifiableCredential: (selectedVcs!.length > 0) ? selectedVcs : undefined,
      verify: false
    });
  } catch (error) {
    // If expired, create presentation manually to bypass validation
    if (error instanceof Error && error.message.includes('validUntil')) {
      console.log('[composeVp.ts] Bypassing expiration check for signed VP creation');
      presentation = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        holder: selectedProfile.did,
        ...(selectedVcs!.length > 0 && { verifiableCredential: selectedVcs })
      };
    } else {
      throw error;
    }
  }
  
  return await vc.signPresentation({
    presentation, challenge, domain, documentLoader,
    suite: new Ed25519Signature2020({ signer: selectedProfile.signers.authentication })
  })
}
