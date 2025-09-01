// import '@digitalcredentials/data-integrity-rn';
import { VerifiablePresentation, PresentationError } from '../types/presentation';
import { Credential, CredentialError } from '../types/credential';
// import * as verifierCore from '@digitalcredentials/verifier-core';
import { IVerifiableCredential, IVerifiablePresentation } from '@digitalcredentials/ssi';

export type ResultLog = {
  id: string,
  valid: boolean,
  error?: any
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
  presentation: IVerifiablePresentation
): Promise<VerifyResponse> {
  try {
    // const result = await verifierCore.verifyPresentation({
    //   presentation
    // });
    // if (!result.verified) {
    //   console.warn('VP not verified:', JSON.stringify(result, null, 2));
    // }
    // return result;
    return {} as VerifyResponse;
  } catch (err) {
    console.warn(err);

    throw new Error(PresentationError.CouldNotBeVerified);
  }
}

// export async function verifyCredential(credential: IVerifiableCredential): Promise<VerifyResponse> {
//   const response = await fetch('https://digitalcredentials.github.io/dcc-known-registries/known-did-registries.json');
//   const knownDIDRegistries = await response.json();
//
//   // const isInRegistry = issuerInRegistries({ issuer, registries });
//   // if (!isInRegistry) {
//   //   throw new Error(CredentialError.DidNotInRegistry);
//   // }
//
//   try {
//     // const result = await verifierCore.verifyCredential({
//     //   credential,
//     //   knownDIDRegistries: knownDIDRegistries
//     // });
//
//     const result = {} as VerifyResponse;
//
//     //console.log('Verify result:', JSON.stringify(result, null, 2));
//
//     if (result.results?.[0].error){
//       result.results[0].log = result.results[0].error.log;
//     }
//
//     // This logic catches the case where the verify response does not contain a `log` value
//     if (result.log === undefined) {
//       throw result.error || new Error('Verify response does not a `log` value');
//     }
//
//     result.verified = Array.isArray(result.log)
//       ? result.log.every((check: { valid: any; }) => check.valid)
//       : false;
//
//     if (!result.results) {
//       result.results = [{
//         verified: (result.log as ResultLog[]).every(check => check.valid),
//         log: result.log,
//         credential: result.credential
//       }];
//     }
//
//     if (result?.verified === false) {
//       const revocationIndex = (result.log as ResultLog[]).findIndex(
//         c => c.id === 'revocation_status'
//       );
//
//       if (revocationIndex !== -1) {
//         const revocationObject = result.log[revocationIndex];
//
//         if (revocationObject?.error?.name === 'status_list_not_found') {
//           (result.log as ResultLog[]).splice(revocationIndex, 1);
//
//           // Re-evaluate verification result based on remaining logs
//           result.verified = (result.log as ResultLog[]).every(log => log.valid);
//         } else {
//           const revocationResult = {
//             id: 'revocation_status',
//             valid: revocationObject.valid ?? false,
//           };
//
//           (result.results[0].log ??= []).push(revocationResult);
//           result.hasStatusError = !!revocationObject.error;
//         }
//       }
//     }
//
//
//
//
//     if (!result.verified) {
//       console.warn('VC not verified:', JSON.stringify(result, null, 2));
//     }
//
//     return result;
//   } catch (err) {
//     console.warn('verifyCredential', err, JSON.stringify(err, removeStackReplacer, 2));
//
//     throw new Error(CredentialError.CouldNotBeVerified);
//   }
// }

function removeStackReplacer(key: string, value: unknown) {
  return key === 'stack' ? '...' : value;
}
