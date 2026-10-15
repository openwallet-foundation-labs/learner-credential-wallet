/**
 * credentialContentHash with the real crypto-polyfill.js. The other
 * credentialHash tests mock `crypto`.
 */
import * as nodeCrypto from 'node:crypto'
import {
  canonicalCredentialJson,
  credentialContentHash
} from '../app/lib/credentialHash'
import { mockCredential } from '../app/mock/credential'

jest.unmock('crypto')
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))

it('is the SHA-256 of the canonical JSON', () => {
  const expected = nodeCrypto
    .createHash('sha256')
    .update(canonicalCredentialJson(mockCredential))
    .digest('hex')
  expect(credentialContentHash(mockCredential)).toBe(expected)
})

it('ignores key order and changes with content', () => {
  const reordered = Object.fromEntries(
    Object.entries(mockCredential).reverse()
  ) as typeof mockCredential
  expect(credentialContentHash(reordered)).toBe(
    credentialContentHash(mockCredential)
  )
  expect(
    credentialContentHash({ ...mockCredential, id: 'urn:uuid:other' })
  ).not.toBe(credentialContentHash(mockCredential))
})
