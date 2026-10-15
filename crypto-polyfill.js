/**
 * The subset of Node's `crypto` module that the app and its bundled
 * dependencies use. Metro (metro.config.js) and Babel (babel.config.js) alias
 * `crypto` to this file.
 *
 * - Random bytes come from expo-crypto's native `getRandomValues`
 *   (SecRandomCopyBytes on iOS, SecureRandom on Android).
 * - Hashes and PBKDF2 come from @noble/hashes.
 *
 * Anything else from Node's `crypto` is deliberately absent, so calling it
 * throws instead of returning made-up output. Unsupported algorithms,
 * encodings and arguments throw too.
 */
import { Buffer } from '@craftzdog/react-native-buffer'
import { getRandomValues } from 'expo-crypto'
import {
  pbkdf2 as noblePbkdf2,
  pbkdf2Async as noblePbkdf2Async
} from '@noble/hashes/pbkdf2'
import { sha256, sha512 } from '@noble/hashes/sha2'

const HASHES = { sha256, sha512 }

function hashFor(algorithm) {
  const name = String(algorithm).toLowerCase().replace('-', '')
  const hash = Object.prototype.hasOwnProperty.call(HASHES, name)
    ? HASHES[name]
    : undefined
  if (hash === undefined) {
    throw new Error(`crypto: unsupported digest algorithm "${algorithm}"`)
  }
  return hash
}

/** Strings are UTF-8 unless an encoding is given, as in Node. */
function toBytes(input, encoding) {
  if (typeof input === 'string') {
    const buffer = Buffer.from(input, encoding || 'utf8')
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input)
  }
  throw new TypeError(
    'crypto: expected a string, Buffer, TypedArray, DataView or ArrayBuffer'
  )
}

function toBuffer(bytes) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function assertNonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`crypto: ${name} must be a non-negative integer`)
  }
}

function pbkdf2Args(password, salt, iterations, keylen, digest) {
  if (digest === undefined) {
    throw new TypeError('crypto: pbkdf2 requires a digest')
  }
  if (!Number.isSafeInteger(iterations) || iterations < 1) {
    throw new RangeError('crypto: iterations must be a positive integer')
  }
  assertNonNegativeInteger(keylen, 'keylen')
  return [
    hashFor(digest),
    toBytes(password),
    toBytes(salt),
    { c: iterations, dkLen: keylen }
  ]
}

/**
 * Cryptographically secure random bytes. With a callback, the result is
 * delivered asynchronously, as in Node.
 */
export function randomBytes(size, callback) {
  assertNonNegativeInteger(size, 'size')
  const bytes = new Uint8Array(size)
  if (size > 0) getRandomValues(bytes)
  // A Buffer over its own ArrayBuffer: some callers read `.buffer` directly.
  const buffer = toBuffer(bytes)
  if (typeof callback === 'function') {
    setTimeout(() => callback(null, buffer), 0)
    return undefined
  }
  return buffer
}

/** PBKDF2-HMAC with SHA-256 or SHA-512. Returns a Buffer of `keylen` bytes. */
export function pbkdf2Sync(password, salt, iterations, keylen, digest) {
  const [hash, pw, s, opts] = pbkdf2Args(
    password,
    salt,
    iterations,
    keylen,
    digest
  )
  return toBuffer(noblePbkdf2(hash, pw, s, opts))
}

/**
 * Callback form of `pbkdf2Sync`, as in Node. Note that @noble/hashes yields
 * to the microtask queue, not the event loop, so this still blocks rendering.
 */
export function pbkdf2(password, salt, iterations, keylen, digest, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('crypto: pbkdf2 requires a callback')
  }
  const [hash, pw, s, opts] = pbkdf2Args(
    password,
    salt,
    iterations,
    keylen,
    digest
  )
  noblePbkdf2Async(hash, pw, s, opts).then(
    (key) => callback(null, toBuffer(key)),
    (err) => callback(err)
  )
}

/**
 * SHA-256 or SHA-512. `update` takes strings (UTF-8 by default), Buffers,
 * TypedArrays, DataViews and ArrayBuffers. `digest` returns a Buffer, or a
 * 'hex' or 'base64' string.
 */
export function createHash(algorithm) {
  const state = hashFor(algorithm).create()
  let finished = false
  const assertNotFinished = () => {
    if (finished) throw new Error('crypto: digest already called')
  }
  return {
    update(data, inputEncoding) {
      assertNotFinished()
      state.update(toBytes(data, inputEncoding))
      return this
    },
    digest(encoding) {
      assertNotFinished()
      if (
        encoding !== undefined &&
        encoding !== 'buffer' &&
        encoding !== 'hex' &&
        encoding !== 'base64'
      ) {
        throw new Error(`crypto: unsupported digest encoding "${encoding}"`)
      }
      finished = true
      const buffer = toBuffer(state.digest())
      return encoding === undefined || encoding === 'buffer'
        ? buffer
        : buffer.toString(encoding)
    }
  }
}

export default {
  randomBytes,
  pbkdf2Sync,
  pbkdf2,
  createHash
}
