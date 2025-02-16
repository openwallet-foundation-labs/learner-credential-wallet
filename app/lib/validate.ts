// import '@digitalcredentials/data-integrity-rn';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { DataIntegrityProof } from '@digitalcredentials/data-integrity';
import { cryptosuite as eddsaRdfc2022CryptoSuite } from '@digitalcredentials/eddsa-rdfc-2022-cryptosuite';

import { purposes } from '@digitalcredentials/jsonld-signatures';
import * as vc from '@digitalcredentials/vc';

import { VerifiablePresentation, PresentationError } from '../types/presentation';
import { Credential, CredentialError } from '../types/credential';

import { securityLoader } from '@digitalcredentials/security-document-loader'; 
import { RegistryClient } from '@digitalcredentials/issuer-registry-client';
import { getCredentialStatusChecker } from './credentialStatus';
import { issuerInRegistries } from './issuerInRegistries';
import { extractCredentialsFrom } from './verifiableObject';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();
// for verifying eddsa-2022 signatures
const eddsaSuite = new DataIntegrityProof({ cryptosuite: eddsaRdfc2022CryptoSuite });
// for verifying ed25519-2020 signatures
const ed25519Suite = new Ed25519Signature2020();
// add both suites - the vc lib will use whichever is appropriate
const suite = [ed25519Suite, eddsaSuite];

const presentationPurpose = new purposes.AssertionProofPurpose();

export type ResultLog = {
  id: string,
  valid: boolean
}

export type Result = {
  verified: boolean;
  credential: Credential;
  error: CredentialError;
  log: ResultLog[];
}

export type VerifyResponse = {
  verified: boolean;
  results: Result[];
}

export async function verifyPresentation(
  presentation: VerifiablePresentation,
  unsignedPresentation = true,
): Promise<VerifyResponse> {
  try {
    const credential = extractCredentialsFrom(presentation)?.find(
      vc => vc.credentialStatus);
    const checkStatus = credential ? getCredentialStatusChecker(credential) : undefined;
    const result = await vc.verify({
      presentation,
      presentationPurpose,
      suite,
      documentLoader,
      unsignedPresentation,
      checkStatus
    });

    if (!result.verified) {
      console.warn('VP not verified:', JSON.stringify(result, null, 2));
    }
    return result;
  } catch (err) {
    console.warn(err);

    throw new Error(PresentationError.CouldNotBeVerified);
  }
}

export async function verifyCredential(credential: Credential, registries: RegistryClient): Promise<VerifyResponse> {
  const { issuer } = credential;
  const isInRegistry = issuerInRegistries({ issuer, registries });
  if (!isInRegistry) {
    throw new Error(CredentialError.DidNotInRegistry);
  }

  try {
    const checkStatus = credential.credentialStatus ? getCredentialStatusChecker(credential) : undefined;
    const result = await vc.verifyCredential({
      credential,
      suite,
      documentLoader,
      // Only check revocation status if VC has a 'credentialStatus' property
      checkStatus
    });

    // This logic catches the case where the verify response does not contain a `log` value
    if (result.results?.[0].log === undefined) {
      throw result.error || new Error('Verify response does not a `log` value');
    }

    if (!result.verified) {
      console.warn('VC not verified:', JSON.stringify(result, null, 2));
    }

    return result;
  } catch (err) {
    console.warn('verifyCredential', err, JSON.stringify(err, removeStackReplacer, 2));

    throw new Error(CredentialError.CouldNotBeVerified);
  }
}

function removeStackReplacer(key: string, value: unknown) {
  return key === 'stack' ? '...' : value;
}
