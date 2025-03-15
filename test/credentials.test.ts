import { securityLoader } from '@digitalcredentials/security-document-loader';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import * as vc from '@digitalcredentials/vc';

import { getCredentialStatusChecker } from '../app/lib/credentialStatus';
import { rawVcRecords, mockCredential } from '../app/mock/credential';
import { credentialMatchesVprExampleQuery, filterCredentialRecordsByType } from '../app/lib/credentialMatching';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();
const suite = new Ed25519Signature2020();

const query = {
  'type': 'QueryByExample',
  'credentialQuery': {
    'reason': 'Please present your Verifiable Credential to complete the verification process.',
    'example': {
      '@context': [
        'https://www.w3.org/2018/credentials/v1'
      ],
      'type': [
        'VerifiableCredential'
      ]
    }
  }
};

describe('Querying', () => {
  it('filters raw VC records by type query', async () => {
    const result = filterCredentialRecordsByType(rawVcRecords, query);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('_id', '67d35fcdd4e86a52196c58df');
  });

  it('matches a stored VC to a VPR query', async () => {
    const result = credentialMatchesVprExampleQuery(
      query.credentialQuery.example, rawVcRecords[0]);
    expect(result).toBe(true);
  });
});

describe('Verification', () => {
  it('verifies the mock VC', async () => {
    const checkStatus = getCredentialStatusChecker(mockCredential);
    const result = await vc.verifyCredential({
      credential: mockCredential,
      suite,
      documentLoader,
      checkStatus
    });
    expect(result).toStrictEqual({
      log: [
        { id: 'expiration', valid: true },
        { id: 'valid_signature', valid: true },
        { id: 'issuer_did_resolves', valid: true },
        { id: 'revocation_status', valid: true },
      ],
      results: [
        {
          error: undefined,
          log: [
            { id: 'expiration', valid: true },
            { id: 'valid_signature', valid: true },
            { id: 'issuer_did_resolves', valid: true },
            { id: 'revocation_status', valid: true },
          ],
          proof: {
            '@context': [
              'https://www.w3.org/2018/credentials/v1',
              'https://w3id.org/security/suites/ed25519-2020/v1',
              'https://w3id.org/dcc/v1',
              'https://w3id.org/vc/status-list/2021/v1',
            ],
            created: '2022-08-19T06:55:17Z',
            proofPurpose: 'assertionMethod',
            proofValue:
              'z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw',
            type: 'Ed25519Signature2020',
            verificationMethod:
              'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          },
          purposeResult: { valid: true },
          verificationMethod: {
            '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
            controller:
              'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
            id: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
            publicKeyMultibase:
              'z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
            type: 'Ed25519VerificationKey2020',
          },
          verified: true,
        },
      ],
      statusResult: {
        results: [
          {
            credentialStatus: {
              id: 'https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU#2',
              statusListCredential:
                'https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU',
              statusListIndex: 2,
              statusPurpose: 'revocation',
              type: 'StatusList2021Entry',
            },
            verified: true,
          },
        ],
        verified: true,
      },
      verified: true,
    });
  });
});
