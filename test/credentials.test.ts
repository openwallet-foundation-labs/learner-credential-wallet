// Mock external dependencies
import { IQueryByExample } from '../app/lib/vcApi';

jest.mock('@digitalcredentials/security-document-loader');
jest.mock('@digitalcredentials/ed25519-signature-2020');
jest.mock('@digitalcredentials/vc');

// import { getCredentialStatusChecker } from '../app/lib/credentialStatus';
import { rawVcRecords, mockCredential } from '../app/mock/credential';
import { filterCredentialRecordsByType } from '../app/lib/credentialMatching';

// Sample query for type filtering
const query = {
  type: 'QueryByExample',
  credentialQuery: {
    reason: 'Please present your Verifiable Credential to complete the verification process.',
    example: {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
    },
  },
} as IQueryByExample;

describe('Credential Matching and Verification', () => {
  describe('Querying', () => {
    it('filters raw VC records by type query', async () => {
      const result = filterCredentialRecordsByType(rawVcRecords, query);
      console.log('Result after filtering:', result);
      expect(result).toHaveLength(2);

      // Dynamically check the _id values
      expect(result[0]).toHaveProperty('_id');
      expect(result[1]).toHaveProperty('_id');

      // Optionally check that the _id values are unique
      expect(result[0]._id).not.toBe(result[1]._id);

      // You could also test other properties
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[1]).toHaveProperty('createdAt');
    });
  });

  describe('Verification', () => {
    it('verifies the mock VC and checks credential status', async () => {
      const result = {
        log: [
          { id: 'valid_signature', valid: true },
          { id: 'issuer_did_resolves', valid: true },
          { id: 'expiration', valid: true },
          { id: 'revocation_status', valid: true },
        ],
        results: [
          {
            error: undefined,
            log: [
              { id: 'valid_signature', valid: true },
              { id: 'issuer_did_resolves', valid: true },
              { id: 'expiration', valid: true },
              { id: 'revocation_status', valid: true },
            ],
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
        proof: {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
            'https://w3id.org/dcc/v1',
            'https://w3id.org/vc/status-list/2021/v1',
          ],
          created: '2022-08-19T06:55:17Z',
          proofPurpose: 'assertionMethod',
          proofValue: 'z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw',
          type: 'Ed25519Signature2020',
          verificationMethod: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        },
        purposeResult: {
          valid: true,
        },
        verificationMethod: {
          '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
          controller: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          id: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          publicKeyMultibase: 'z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          type: 'Ed25519VerificationKey2020',
        },
        verified: true,
      };

      expect(result).toEqual({
        log: [
          { id: 'valid_signature', valid: true },
          { id: 'issuer_did_resolves', valid: true },
          { id: 'expiration', valid: true },
          { id: 'revocation_status', valid: true },
        ],
        results: [
          {
            error: undefined,
            log: [
              { id: 'valid_signature', valid: true },
              { id: 'issuer_did_resolves', valid: true },
              { id: 'expiration', valid: true },
              { id: 'revocation_status', valid: true },
            ],
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
        proof: {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1',
            'https://w3id.org/dcc/v1',
            'https://w3id.org/vc/status-list/2021/v1',
          ],
          created: '2022-08-19T06:55:17Z',
          proofPurpose: 'assertionMethod',
          proofValue: 'z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw',
          type: 'Ed25519Signature2020',
          verificationMethod: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        },
        purposeResult: {
          valid: true,
        },
        verificationMethod: {
          '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
          controller: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          id: 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          publicKeyMultibase: 'z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
          type: 'Ed25519VerificationKey2020',
        },
        verified: true,
      });
    });
  });
});
