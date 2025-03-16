
import { Credential, CredentialError } from '../types/credential';
import {verifyCredential as coreVerify} from '@digitalcredentials/verifier-core';

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

const knownDIDRegistries = [
  {
    'name': 'DCC Pilot Registry',
    'url': 'https://digitalcredentials.github.io/issuer-registry/registry.json'
  },
  {
    'name': 'DCC Sandbox Registry',
    'url': 'https://digitalcredentials.github.io/sandbox-registry/registry.json'
  },
  {
    'name': 'DCC Community Registry',
    'url': 'https://digitalcredentials.github.io/community-registry/registry.json'
  },
  {
    'name': 'DCC Registry',
    'url': 'https://digitalcredentials.github.io/dcc-registry/registry.json'
  }
];


export async function verifyCredential(credential: Credential, registries: any): Promise<any> {
  try {
    const result = await coreVerify({credential,knownDIDRegistries, reloadIssuerRegistry: true})
    console.log("the verify-core result:")
    console.log(JSON.stringify(result,null,2))
    throw new Error()
  } catch (err) {
    console.warn('verifyCredential', err, JSON.stringify(err, removeStackReplacer, 2));

    throw new Error(CredentialError.CouldNotBeVerified);
  }
}

function removeStackReplacer(key: string, value: unknown) {
  return key === 'stack' ? '...' : value;
}
