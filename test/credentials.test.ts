import { securityLoader } from '@digitalcredentials/security-document-loader';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import * as vc from '@digitalcredentials/vc';

import { getCredentialStatusChecker } from '../app/lib/credentialStatus';
import { mockCredential } from '../app/mock/credential';
import { credentialMatchesVprExampleQuery } from '../app/lib/exchanges';

import { CredentialRecordRaw } from '../app/types/credential';

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build();
const suite = new Ed25519Signature2020();

// @ts-ignore
const internalVcRecords: CredentialRecordRaw[] = [
  {
    '_id': '67d35fcdd4e86a52196c58df',
    'createdAt': '2025-03-13T22:44:29.011Z',
    'updatedAt': '2025-03-13T22:44:29.011Z',
    'rawCredential': '{"@context":["https://www.w3.org/2018/credentials/v1","https://w3id.org/security/suites/ed25519-2020/v1","https://w3id.org/dcc/v1","https://w3id.org/vc/status-list/2021/v1"],"type":["VerifiableCredential","Assertion"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","name":"Example University","url":"https://cs.example.edu","image":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png"},"issuanceDate":"2020-08-16T12:00:00.000+00:00","credentialSubject":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","name":"Kayode Ezike","hasCredential":{"type":["EducationalOccupationalCredential"],"name":"GT Guide","description":"The holder of this credential is qualified to lead new student orientations."}},"expirationDate":"2025-08-16T12:00:00.000+00:00","credentialStatus":{"id":"https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU#2","type":"StatusList2021Entry","statusPurpose":"revocation","statusListIndex":2,"statusListCredential":"https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU"},"proof":{"type":"Ed25519Signature2020","created":"2022-08-19T06:55:17Z","verificationMethod":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","proofPurpose":"assertionMethod","proofValue":"z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw"}}',
    'credential': {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/dcc/v1',
        'https://w3id.org/vc/status-list/2021/v1'
      ],
      'type': [
        'VerifiableCredential',
        'Assertion'
      ],
      'issuer': {
        'id': 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        'name': 'Example University',
        'url': 'https://cs.example.edu',
        'image': 'https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png'
      },
      'issuanceDate': '2020-08-16T12:00:00.000+00:00',
      'credentialSubject': {
        'id': 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        'name': 'Kayode Ezike',
        'hasCredential': {
          'type': [
            'EducationalOccupationalCredential'
          ],
          'name': 'GT Guide',
          'description': 'The holder of this credential is qualified to lead new student orientations.'
        }
      },
      'expirationDate': '2025-08-16T12:00:00.000+00:00',
      'credentialStatus': {
        'id': 'https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU#2',
        'type': 'StatusList2021Entry',
        'statusPurpose': 'revocation',
        'statusListIndex': 2,
        'statusListCredential': 'https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU'
      },
      'proof': {
        'type': 'Ed25519Signature2020',
        'created': '2022-08-19T06:55:17Z',
        'verificationMethod': 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        'proofPurpose': 'assertionMethod',
        'proofValue': 'z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw'
      }
    },
    'profileRecordId': '67d35fbbd4e86a52196c58de'
  },
  {
    '_id': '67d35fcdd4e86a52196c58e0',
    'createdAt': '2025-03-13T22:44:29.013Z',
    'updatedAt': '2025-03-13T22:44:29.013Z',
    'rawCredential': '{"@context":["https://www.w3.org/2018/credentials/v1","https://w3id.org/security/suites/ed25519-2020/v1","https://w3id.org/dcc/v1","https://w3id.org/vc/status-list/2021/v1"],"type":["VerifiableCredential","Assertion"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","name":"Example University","url":"https://cs.example.edu","image":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png"},"issuanceDate":"2020-08-16T12:00:00.000+00:00","credentialSubject":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","name":"Kayode Ezike","hasCredential":{"type":["EducationalOccupationalCredential"],"name":"GT Guide","description":"The holder of this credential is qualified to lead new student orientations."}},"expirationDate":"2025-08-16T12:00:00.000+00:00","credentialStatus":{"id":"https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU#2","type":"StatusList2021Entry","statusPurpose":"revocation","statusListIndex":2,"statusListCredential":"https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU"},"proof":{"type":"Ed25519Signature2020","created":"2022-08-19T06:55:17Z","verificationMethod":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","proofPurpose":"assertionMethod","proofValue":"z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw"}}',
    'credential': {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/dcc/v1',
        'https://w3id.org/vc/status-list/2021/v1'
      ],
      'type': [
        'VerifiableCredential',
        'Assertion'
      ],
      'issuer': {
        'id': 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        'name': 'Example University',
        'url': 'https://cs.example.edu',
        'image': 'https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png'
      },
      'issuanceDate': '2020-08-16T12:00:00.000+00:00',
      'credentialSubject': {
        'id': 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        'name': 'Kayode Ezike',
        'hasCredential': {
          'type': [
            'EducationalOccupationalCredential'
          ],
          'name': 'GT Guide',
          'description': 'The holder of this credential is qualified to lead new student orientations.'
        }
      },
      'expirationDate': '2025-08-16T12:00:00.000+00:00',
      'credentialStatus': {
        'id': 'https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU#2',
        'type': 'StatusList2021Entry',
        'statusPurpose': 'revocation',
        'statusListIndex': 2,
        'statusListCredential': 'https://digitalcredentials.github.io/credential-status-playground/JWZM3H8WKU'
      },
      'proof': {
        'type': 'Ed25519Signature2020',
        'created': '2022-08-19T06:55:17Z',
        'verificationMethod': 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC#z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
        'proofPurpose': 'assertionMethod',
        'proofValue': 'z4EiTbmC79r4dRaqLQZr2yxQASoMKneHVNHVaWh1xcDoPG2eTwYjKoYaku1Canb7a6Xp5fSogKJyEhkZCaqQ6Y5nw'
      }
    },
    'profileRecordId': '67d35fbbd4e86a52196c58de'
  }
];

const query = {
  'type': 'QueryByExample',
  'credentialQuery': {
    'reason': 'Please present your Verifiable Credential to complete the verification process.',
    'example': {
      '@context': [
        'https://www.w3.org/2018/credentials/v2'
      ],
      'type': [
        'VerifiableCredential'
      ]
    }
  }
};

describe.only('Querying', () => {
  it('matches stored VCs to a VPR query', async () => {
    const matches = await credentialMatchesVprExampleQuery(query, internalVcRecords[0]);
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
