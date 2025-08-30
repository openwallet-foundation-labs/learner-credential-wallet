// app/lib/present.ts
import uuid from 'react-native-uuid';
import { createPresentation, signPresentation } from '../shims/vc';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { getDidMethodKey } from '../shims/didMethodKey';
import { buildBaseSecurityLoader } from '../shims/securityLoader';

import type { VerifiablePresentation } from '../types/presentation';
import type { DidRecordRaw } from '../model/did';
import type { Credential } from '../types/credential';

type SignPresentationParams = {
  didRecord: DidRecordRaw;
  verifiableCredential?: Credential[] | Credential;
  challenge?: string;
};

// Lazily-initialized helpers
let _baseLoader: any;
let _didKeyDriver: any;

async function getDocumentLoader() {
  if (!_baseLoader) _baseLoader = buildBaseSecurityLoader(true);
  if (!_didKeyDriver) {
    const DidMethodKey = getDidMethodKey();
    _didKeyDriver = DidMethodKey.driver();
  }

  const base = _baseLoader;

  // Wrap the base loader to resolve did:key DIDs inline
  return async function documentLoader(url: string) {
    if (typeof url === 'string' && url.startsWith('did:key:')) {
      const { didDocument } = await _didKeyDriver.get({ did: url });
      return { contextUrl: null, documentUrl: url, document: didDocument };
    }
    return base(url);
  };
}

export async function createVerifiablePresentation({
  didRecord,
  verifiableCredential,
  challenge = uuid.v4() as string,
}: SignPresentationParams): Promise<VerifiablePresentation> {
  // Build key & suite
  const keyPair = await Ed25519VerificationKey2020.from(didRecord.verificationKey);

  // Ensure controller + verificationMethod are set and consistent with the DID doc
  keyPair.controller ||= didRecord.didDocument.id;
  const verificationMethod =
    keyPair.id ?? `${didRecord.didDocument.id}#${didRecord.verificationKey?.id ?? 'keys-1'}`;

  const suite = new Ed25519Signature2020({
    key: keyPair,
    verificationMethod,
  });

  const holder = didRecord.didDocument.id;
  const presentation = createPresentation({ verifiableCredential, holder });

  const documentLoader = await getDocumentLoader();

  const vp: VerifiablePresentation = await signPresentation({
    presentation,
    suite,
    challenge,
    documentLoader,
  });

  return vp;
}

export function createUnsignedPresentation(vcs: Credential[] | Credential): VerifiablePresentation {
  return createPresentation({ verifiableCredential: vcs });
}
