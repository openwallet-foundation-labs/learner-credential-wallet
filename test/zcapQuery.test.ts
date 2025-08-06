jest.mock('../app/lib/globalModal', () => ({
  displayGlobalModal: jest.fn().mockResolvedValue(true),
  clearGlobalModal: jest.fn()
}));

import handleZcapRequest from '../app/lib/handleZcapRequest';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => {
    if (key === 'was_signer_json') {
      return JSON.stringify({
        id: 'did:key:123#123',
        controller: 'did:key:123',
        type: 'Ed25519VerificationKey2020',
        privateKeyMultibase: 'zFakePrivateKey',
        publicKeyMultibase: 'zFakePublicKey'
      });
    }
    return null;
  },
  setItem: jest.fn()
}));

jest.mock('@digitalcredentials/ed25519-verification-key-2020', () => ({
  Ed25519VerificationKey2020: {
    from: async () => ({
      signer: () => ({
        sign: async () => ({ proofValue: 'zFakeProof' })
      })
    })
  }
}));

jest.mock('@digitalbazaar/ezcap', () => ({
  ZcapClient: class {
    constructor() {}
    async delegate() {
      return { id: 'urn:fake:zcap', proof: { type: 'Ed25519Signature2020' } };
    }
  }
}));

describe('handleZcapRequest', () => {
  it('returns a VP with a delegated zcap when approved', async () => {
    const request = {
      query: [{
        type: 'ZcapQuery',
        capabilityQuery: {
          allowedAction: ['GET'],
          controller: 'did:key:abc',
          invocationTarget: {
            type: 'urn:was:collection',
            name: 'VC',
            contentType: 'application/vc'
          },
          reason: 'Testing access'
        }
      }]
    };

    const result = await handleZcapRequest({ request });

    expect(result.verifiablePresentation).toBeDefined();
    expect(result.verifiablePresentation.verifiableCredential[0].id).toBe('urn:fake:zcap');
  });

  it('throws if no ZcapQuery is found', async () => {
    await expect(handleZcapRequest({ request: { query: [] } })).rejects.toThrow(
      'No ZcapQuery found in request.'
    );
  });
});
