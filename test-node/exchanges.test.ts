import { it, describe } from 'node:test'
import assert from 'node:assert'
import { extractCredentialsFrom } from '../app/lib/verifiableObject'
import { mockCredential } from '../app/mock/credential'

/**
 * Tests for the exchange response handling fix.
 *
 * processMessageChain now checks the response from processRequest for a
 * verifiablePresentation and uses extractCredentialsFrom to extract any
 * issued credentials. These tests verify that extractCredentialsFrom
 * correctly handles the response shapes an exchanger might return.
 *
 * processMessageChain/processRequest themselves can't be tested in the Node
 * runner due to transitive React Native dependencies (selectCredentials →
 * store → react-native-keychain). Integration is verified via end-to-end
 * testing.
 */

describe('extractCredentialsFrom (exchange response handling)', () => {
  it('extracts credentials from a VP with a single VC', () => {
    const vp = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [mockCredential]
    }
    const result = extractCredentialsFrom(vp as any)
    assert.ok(result, 'Should return credentials')
    assert.strictEqual(result!.length, 1)
  })

  it('extracts credentials from a VP with multiple VCs', () => {
    const vc2 = { ...mockCredential, id: 'urn:uuid:second-vc' }
    const vp = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: [mockCredential, vc2]
    }
    const result = extractCredentialsFrom(vp as any)
    assert.ok(result, 'Should return credentials')
    assert.strictEqual(result!.length, 2)
  })

  it('returns null for a VP with no verifiableCredential', () => {
    const vp = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation']
    }
    const result = extractCredentialsFrom(vp as any)
    assert.strictEqual(result, null)
  })

  it('wraps a single non-array VC in an array', () => {
    const vp = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: mockCredential
    }
    const result = extractCredentialsFrom(vp as any)
    assert.ok(result, 'Should return credentials')
    assert.strictEqual(result!.length, 1)
  })

  it('returns a single VC directly if passed a VC (not a VP)', () => {
    const result = extractCredentialsFrom(mockCredential as any)
    assert.ok(result, 'Should return credentials')
    assert.strictEqual(result!.length, 1)
  })
})
