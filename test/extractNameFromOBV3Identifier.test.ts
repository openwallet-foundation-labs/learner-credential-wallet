import { extractNameFromOBV3Identifier } from '../app/lib/extractNameFromOBV3Identifier'
import { ICredentialSubject } from '@digitalcredentials/ssi'

describe('extractNameFromOBV3Identifier', () => {
  it('should return null when there is no identifier object', async () => {
    expect(extractNameFromOBV3Identifier({ id: '123' })).toEqual(undefined)
  })

  it('should return null when the identifier object is empty', async () => {
    expect(extractNameFromOBV3Identifier({ identifier: {} })).toEqual(undefined)
  })

  it('should return null when the identityType is invalid', async () => {
    expect(
      extractNameFromOBV3Identifier({
        identifier: { identityType: 'something' }
      })
    ).toEqual(undefined)
  })

  it('should return name from a valid OBV3 identifier object', async () => {
    const credentialSubject: ICredentialSubject = {
      identifier: { identityType: 'name', identityHash: 'Jane Doe' }
    }

    expect(extractNameFromOBV3Identifier(credentialSubject)).toEqual('Jane Doe')
  })

  it('should return name from a valid OBV3 array of identifiers', async () => {
    const credentialSubject: ICredentialSubject = {
      identifier: [{ identityType: 'name', identityHash: 'Jane Doe' }]
    }

    expect(extractNameFromOBV3Identifier(credentialSubject)).toEqual('Jane Doe')
  })
})
