import { IOpenBadgeCredentialV3 } from '@digitalcredentials/ssi';

export const mockOpenBadgeWithAlignments: IOpenBadgeCredentialV3 = {
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
  ],
  id: 'http://example.edu/credentials/3732',
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: {
    id: 'https://example.edu/issuers/565049',
    name: 'Example University'
  },
  validFrom: '2010-01-01T00:00:00Z',
  name: 'Example University Degree',
  credentialSubject: {
    id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
    achievement: {
      id: 'https://1edtech.edu/achievements/1',
      type: ['Achievement'],
      criteria: {
        type: 'Criteria',
        narrative: 'Cite strong and thorough textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text, including determining where the text leaves matters uncertain'
      },
      description: 'Analyze a sample text',
      name: 'Text analysis',
      alignment: [
        {
          type: ['Alignment'],
          targetCode: 'ce-cf4dee18-7cea-443a-b920-158a0762c6bf',
          targetFramework: 'Edmonds College Course Catalog',
          targetName: 'Requirements Analysis',
          targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis'
        },
        {
          type: ['Alignment'],
          targetName: 'Requirements Analysis with Description',
          targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis',
          targetDescription: 'This is a description'
        },
        {
          // This alignment should be filtered out - no targetUrl
          type: ['Alignment'],
          targetName: 'Invalid - No URL'
        },
        {
          // This alignment should be filtered out - invalid URL
          type: ['Alignment'],
          targetName: 'Invalid URL',
          targetUrl: 'not-a-valid-url'
        }
      ]
    }
  }
};
