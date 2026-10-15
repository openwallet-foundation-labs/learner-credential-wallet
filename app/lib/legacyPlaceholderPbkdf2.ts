/**
 * The key derivation that releases 2.2.6 to 2.2.10 shipped as `pbkdf2Sync`
 * (crypto-polyfill.js, from commit f7ea5f7). It is NOT PBKDF2 and is not a
 * secure key derivation function. See issue #960.
 *
 * Wallets set up on those releases are encrypted with its output, so it is
 * kept only so that DatabaseAccess.unlock can open such a wallet once and
 * re-encrypt it under the real PBKDF2 key. Do not use it for anything else.
 *
 * Do not change it: the output must stay byte-for-byte identical to what those
 * releases produced. test/legacyPlaceholderPbkdf2.test.ts pins it with golden
 * vectors computed by the original code.
 */
export function legacyPlaceholderPbkdf2(
  password: string,
  salt: string,
  iterations: number,
  keylen: number
): Uint8Array {
  keylen = keylen || 32
  const combined =
    String(password) + String(salt) + String(iterations) + String(keylen)
  const out = new Uint8Array(keylen)
  for (let i = 0; i < keylen; i++) {
    let hash = 0
    for (let j = 0; j < combined.length; j++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(j) + i) & 0xffff
    }
    out[i] = hash & 0xff
  }
  return out
}
