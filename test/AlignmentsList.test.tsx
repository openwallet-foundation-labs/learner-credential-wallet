// Test AlignmentsList component behavior through integration with credentialSubject
// This tests the component's usage in the actual app without complex mocking

import { credentialSubjectRenderInfoFrom } from '../app/lib/credentialDisplay/shared/utils/credentialSubject'
import { getValidAlignments } from '../app/lib/credentialDisplay/shared/utils/alignment'
import { IAlignment, ICredentialSubject } from '@digitalcredentials/ssi'

// Mock only essential dependencies
jest.mock('../app/lib/decode', () => ({
  educationalOperationalCredentialFrom: jest.fn((subject) =>
    Array.isArray(subject.achievement)
      ? subject.achievement[0]
      : subject.achievement
  )
}))

jest.mock('../app/lib/extractNameFromOBV3Identifier', () => ({
  extractNameFromOBV3Identifier: jest.fn(() => null)
}))

jest.mock('../app/lib/credentialDisplay/shared/utils/image', () => ({
  imageSourceFrom: jest.fn(() => null)
}))

describe('AlignmentsList Component Integration', () => {
  it('should provide no alignments when credentialSubject has none', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      achievement: {
        id: 'achievement-1',
        name: 'Test Achievement'
      }
    }

    const result = credentialSubjectRenderInfoFrom(subject)
    const validAlignments = getValidAlignments(result.alignment)

    expect(validAlignments).toHaveLength(0)
    // Component would render null (no "Alignments" header)
  })

  it('should provide valid alignments for component rendering', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      achievement: {
        id: 'achievement-1',
        name: 'Test Achievement',
        alignment: [
          {
            targetName: 'Requirements Analysis',
            targetUrl:
              'https://credentialfinder.org/credential/20229/Requirements_Analysis'
          },
          {
            targetName: 'Test Alignment',
            targetUrl: 'https://example.com/test',
            targetDescription: 'This is a test description'
          }
        ]
      }
    }

    const result = credentialSubjectRenderInfoFrom(subject)
    const validAlignments = getValidAlignments(result.alignment)

    expect(validAlignments).toHaveLength(2)
    expect(validAlignments[0].targetName).toBe('Requirements Analysis')
    expect(validAlignments[1].targetDescription).toBe(
      'This is a test description'
    )
    // Component would render "Alignments" header and both items
  })

  it('should include invalid URLs but mark them as non-clickable', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      achievement: {
        id: 'achievement-1',
        name: 'Test Achievement',
        alignment: [
          { targetName: 'Valid - No URL' },
          {
            targetName: 'Valid Alignment',
            targetUrl: 'https://example.com/valid'
          },
          { targetName: 'Invalid URL', targetUrl: 'not-a-url' }
        ]
      }
    }

    const result = credentialSubjectRenderInfoFrom(subject)
    const validAlignments = getValidAlignments(result.alignment)

    expect(validAlignments).toHaveLength(3)
    expect(validAlignments[0].targetName).toBe('Valid - No URL')
    expect(validAlignments[0].targetUrl).toBeUndefined()
    expect(validAlignments[1].targetName).toBe('Valid Alignment')
    expect(validAlignments[1].targetUrl).toBe('https://example.com/valid')
    expect(validAlignments[1].isValidUrl).toBe(true)
    expect(validAlignments[2].targetName).toBe('Invalid URL')
    expect(validAlignments[2].targetUrl).toBe('not-a-url')
    expect(validAlignments[2].isValidUrl).toBe(false)
    // Component would render "Alignments" header and all three items
  })

  it('should handle mixed valid and invalid alignments', () => {
    const alignments: IAlignment[] = [
      { targetName: 'No URL' },
      { targetUrl: 'https://example.com' }, // No targetName
      {
        targetName: 'Valid with Description',
        targetUrl: 'https://example.com/valid',
        targetDescription: 'Valid description'
      },
      { targetName: 'Invalid URL', targetUrl: 'not-a-url' }
    ]

    const validAlignments = getValidAlignments(alignments)

    expect(validAlignments).toHaveLength(3)
    expect(validAlignments[0].targetName).toBe('No URL')
    expect(validAlignments[0].targetUrl).toBeUndefined()
    expect(validAlignments[1].targetName).toBe('Valid with Description')
    expect(validAlignments[1].targetDescription).toBe('Valid description')
    expect(validAlignments[1].isValidUrl).toBe(true)
    expect(validAlignments[2].targetName).toBe('Invalid URL')
    expect(validAlignments[2].targetUrl).toBe('not-a-url')
    expect(validAlignments[2].isValidUrl).toBe(false)
    // Component would show header and three alignments
  })

  it('should provide valid alignments when some have no URL', () => {
    const alignments: IAlignment[] = [
      { targetName: 'No URL' },
      { targetUrl: 'https://example.com' }, // No targetName
      { targetName: 'Invalid URL', targetUrl: 'not-a-url' }
    ]

    const validAlignments = getValidAlignments(alignments)

    expect(validAlignments).toHaveLength(2)
    expect(validAlignments[0].targetName).toBe('No URL')
    expect(validAlignments[0].targetUrl).toBeUndefined()
    expect(validAlignments[1].targetName).toBe('Invalid URL')
    expect(validAlignments[1].targetUrl).toBe('not-a-url')
    expect(validAlignments[1].isValidUrl).toBe(false)
    // Component would render "Alignments" header and two items
  })

  it('should provide empty array when all alignments lack targetName', () => {
    const alignments: IAlignment[] = [
      { targetUrl: 'https://example.com' }, // No targetName
      { targetUrl: 'https://example2.com' }, // No targetName
      { targetDescription: 'Just description' } // No targetName
    ]

    const validAlignments = getValidAlignments(alignments)

    expect(validAlignments).toHaveLength(0)
    // Component would render null (no "Alignments" header)
  })
})
