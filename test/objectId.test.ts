import { getRandomValues } from 'expo-crypto'
import { randomObjectIdHex } from '../app/lib/objectId'

// Run the real crypto-polyfill.js; jest.setup.js mocks `crypto` elsewhere.
jest.unmock('crypto')
jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((array: Uint8Array) =>
    require('node:crypto').getRandomValues(array)
  )
}))

const mockGetRandomValues = getRandomValues as jest.Mock

it('takes 12 bytes from expo-crypto, never Math.random', () => {
  const mathRandom = jest.spyOn(Math, 'random')
  mockGetRandomValues.mockClear()

  const hex = randomObjectIdHex()

  expect(mockGetRandomValues).toHaveBeenCalledTimes(1)
  const filled = mockGetRandomValues.mock.calls[0][0] as Uint8Array
  expect(filled.length).toBe(12)
  expect(hex).toBe(Buffer.from(filled).toString('hex'))
  expect(hex).toMatch(/^[0-9a-f]{24}$/)
  expect(mathRandom).not.toHaveBeenCalled()
  mathRandom.mockRestore()
})

it('gives different ids on each call', () => {
  const ids = new Set(Array.from({ length: 100 }, randomObjectIdHex))
  expect(ids.size).toBe(100)
})
