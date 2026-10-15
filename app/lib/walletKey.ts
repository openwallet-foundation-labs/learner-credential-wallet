import { Buffer } from '@craftzdog/react-native-buffer'
import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha256, sha512 } from '@noble/hashes/sha2'
import { sha1 } from '@noble/hashes/legacy'
import { bytesToHex } from '@noble/hashes/utils'

import { legacyPlaceholderPbkdf2 } from './legacyPlaceholderPbkdf2'

/**
 * How a wallet's Realm key was derived from its passphrase and salt. Each
 * release line used one of these (issue #960):
 *
 * - 'pbkdf2-sha512': releases up to 2.0.24 (react-native-aes-cipher
 *   Aes.pbkdf2, PBKDF2-SHA512, 256 bits, hex: the same output as
 *   deriveWalletKeyHex), release 2.2.5 (react-native-quick-crypto
 *   1.0.0-beta.20, digest 'SHA-512'), and every new wallet from now on.
 * - 'legacy-sha1': releases 2.1.0 to 2.2.4 called quick-crypto 0.7.x
 *   pbkdf2Sync without a digest, which defaults to SHA-1.
 * - 'legacy-placeholder': releases 2.2.6 to 2.2.10, see
 *   legacyPlaceholderPbkdf2.
 *
 * All of them take 10,000 iterations and give a 32-byte key, used as 64 hex
 * characters. The legacy derivations hard-code those parameters so that
 * changing the live ones can never change a legacy key.
 */
export type KeyDerivation =
  | 'pbkdf2-sha512'
  | 'legacy-sha1'
  | 'legacy-placeholder'

export type LegacyKeyDerivation = Exclude<KeyDerivation, 'pbkdf2-sha512'>

/** The order in which unlock tries the legacy derivations. */
export const LEGACY_KEY_DERIVATIONS: readonly LegacyKeyDerivation[] = [
  'legacy-sha1',
  'legacy-placeholder'
]

const WALLET_KEY_ITERATIONS = 10000
const WALLET_KEY_LENGTH = 32

/** UTF-8, as react-native-quick-crypto encoded string inputs. */
function utf8(text: string): Uint8Array {
  const buffer = Buffer.from(text, 'utf8')
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

/** The wallet key for new and current wallets: PBKDF2-HMAC-SHA512. */
export function deriveWalletKeyHex(passphrase: string, salt: string): string {
  return bytesToHex(
    pbkdf2(sha512, utf8(passphrase), utf8(salt), {
      c: WALLET_KEY_ITERATIONS,
      dkLen: WALLET_KEY_LENGTH
    })
  )
}

/**
 * A key from an earlier release, only for opening a wallet so that it can be
 * re-encrypted with deriveWalletKeyHex. Do not change these parameters.
 */
export function deriveLegacyKeyHex(
  derivation: LegacyKeyDerivation,
  passphrase: string,
  salt: string
): string {
  switch (derivation) {
    case 'legacy-sha1':
      return legacyPbkdf2Sha1Hex(passphrase, salt, 10000, 32)
    case 'legacy-placeholder':
      return bytesToHex(legacyPlaceholderPbkdf2(passphrase, salt, 10000, 32))
  }
}

/**
 * PBKDF2-HMAC-SHA1 with UTF-8 strings, as react-native-quick-crypto 0.7.x
 * computed it. Exported so its test vectors can run through the same code
 * as deriveLegacyKeyHex('legacy-sha1'); do not use it for new keys.
 */
export function legacyPbkdf2Sha1Hex(
  passphrase: string,
  salt: string,
  iterations: number,
  keyLength: number
): string {
  return bytesToHex(
    pbkdf2(sha1, utf8(passphrase), utf8(salt), {
      c: iterations,
      dkLen: keyLength
    })
  )
}

/**
 * A SHA-256 fingerprint of a wallet key, so the key in the biometric
 * keychain can be checked against the current one without reading it (which
 * would prompt for biometrics).
 */
export function walletKeyFingerprint(keyHex: string): string {
  return bytesToHex(sha256(utf8(keyHex)))
}
