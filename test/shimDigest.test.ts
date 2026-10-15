/**
 * shim.js crypto.subtle.digest hashes exactly the bytes of the view it is
 * given, not the whole buffer behind it.
 */
import * as nodeCrypto from 'node:crypto'
import * as ExpoCrypto from 'expo-crypto'

jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn(),
  digest: jest.fn(async (algorithm: string, data: Uint8Array) => {
    const name = algorithm.replace('-', '').toLowerCase()
    const out = require('node:crypto').createHash(name).update(data).digest()
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
  })
}))

const sha256 = (bytes: Uint8Array) =>
  nodeCrypto.createHash('sha256').update(bytes).digest('hex')
const hex = (buffer: ArrayBuffer) => Buffer.from(buffer).toString('hex')

beforeAll(() => {
  require('../shim.js')
})

beforeEach(() => (ExpoCrypto.digest as jest.Mock).mockClear())

// The digests must come from shim.js (which calls expo-crypto), not from a
// WebCrypto the test environment may provide.
afterEach(() => expect(ExpoCrypto.digest).toHaveBeenCalled())

it('hashes only the bytes of a subarray', async () => {
  const all = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8])
  const part = all.subarray(2, 5)

  const digest = await (globalThis as any).crypto.subtle.digest('SHA-256', part)

  expect(hex(digest)).toBe(sha256(Uint8Array.from([3, 4, 5])))
  expect(hex(digest)).not.toBe(sha256(all))
})

it('hashes only the bytes of a DataView', async () => {
  const all = Uint8Array.from([9, 8, 7, 6, 5])
  const view = new DataView(all.buffer, 1, 3)

  const digest = await (globalThis as any).crypto.subtle.digest(
    { name: 'SHA-256' },
    view
  )

  expect(hex(digest)).toBe(sha256(Uint8Array.from([8, 7, 6])))
})

it('hashes a whole ArrayBuffer and a string', async () => {
  const subtle = (globalThis as any).crypto.subtle
  const bytes = Uint8Array.from([1, 2, 3])

  expect(hex(await subtle.digest('SHA-256', bytes.buffer))).toBe(sha256(bytes))
  expect(hex(await subtle.digest('SHA-256', 'abc'))).toBe(
    sha256(new TextEncoder().encode('abc'))
  )
})
