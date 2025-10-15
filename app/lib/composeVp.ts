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
    return await vc.createPresentation({ verifiableCredential: selectedVcs, verify: false });
  }

  // Return a signed VP
  const presentation = await vc.createPresentation({
    holder: selectedProfile.did,
    verifiableCredential: (selectedVcs!.length > 0) ? selectedVcs : undefined,
    verify: false
  });
  return await vc.signPresentation({
    presentation, challenge, domain, documentLoader,
    suite: new Ed25519Signature2020({ signer: selectedProfile.signers.authentication })
  })
}
