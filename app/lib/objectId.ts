import { randomBytes } from 'crypto'

/**
 * 12 cryptographically secure random bytes as hex, for a Realm ObjectId.
 * `crypto` here is crypto-polyfill.js, which reads expo-crypto's native RNG.
 */
export function randomObjectIdHex(): string {
  return randomBytes(12).toString('hex')
}
