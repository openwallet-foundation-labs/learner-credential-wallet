// Mock dependencies
import { ICredentialSubject } from '@digitalcredentials/ssi'

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

import { credentialSubjectRenderInfoFrom } from '../app/lib/credentialDisplay/shared/utils/credentialSubject'

describe('credentialSubjectRenderInfoFrom', () => {
  it('should extract basic subject information', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      name: 'John Doe'
    }

    const result = credentialSubjectRenderInfoFrom(subject)

    expect(result.subjectName).toBe('John Doe')
    expect(result.issuedTo).toBe('John Doe')
    expect(result.degreeName).toBeNull()
    expect(result.description).toBeNull()
    expect(result.criteria).toBeNull()
    expect(result.alignment).toBeUndefined()
  })

  it('should extract achievement information with alignments', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      achievement: {
        id: 'achievement-1',
        name: 'Test Achievement',
        description: 'Test Description',
        criteria: {
          type: 'Criteria',
          narrative: 'Test criteria narrative'
        },
        alignment: [
          {
            targetName: 'Test Alignment',
            targetUrl: 'https://example.com'
          }
        ]
      }
    }

    const result = credentialSubjectRenderInfoFrom(subject)

    expect(result.description).toBe('Test Description')
    expect(result.criteria).toBe('Test criteria narrative')
    expect(result.alignment).toHaveLength(1)
    expect(result.alignment![0].targetName).toBe('Test Alignment')
  })

  it('should handle array of achievements', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      achievement: [
        {
          id: 'achievement-1',
          name: 'First Achievement',
          description: 'First Description'
        },
        {
          id: 'achievement-2',
          name: 'Second Achievement',
          description: 'Second Description'
        }
      ]
    }

    const result = credentialSubjectRenderInfoFrom(subject)
    expect(result.description).toBe('First Description')
  })

  it('should extract degree information', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      degree: {
        type: 'BachelorDegree',
        name: 'Bachelor of Science'
      }
    }

    const result = credentialSubjectRenderInfoFrom(subject)

    expect(result.degreeName).toBe('Bachelor of Science')
  })

  it('should format dates correctly', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123',
      achievement: {
        id: 'achievement-1',
        awardedOnCompletionOf: {
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-12-31T23:59:59Z',
          numberOfCredits: {
            value: '3'
          }
        }
      }
    }

    const result = credentialSubjectRenderInfoFrom(subject)

    expect(result.startDateFmt).toBe('Jan 1, 2023')
    expect(result.endDateFmt).toBe('Dec 31, 2023')
    expect(result.numberOfCredits).toBe('3')
  })

  it('should handle missing optional fields gracefully', () => {
    const subject: ICredentialSubject = {
      id: 'did:example:123'
    }

    const result = credentialSubjectRenderInfoFrom(subject)

    expect(result.subjectName).toBeNull()
    expect(result.issuedTo).toBeNull()
    expect(result.degreeName).toBeNull()
    expect(result.description).toBeNull()
    expect(result.criteria).toBeNull()
    expect(result.numberOfCredits).toBeNull()
    expect(result.startDateFmt).toBeNull()
    expect(result.endDateFmt).toBeNull()
    expect(result.achievementImage).toBeNull()
    expect(result.achievementType).toBeNull()
    expect(result.alignment).toBeUndefined()
  })
})
