import { Platform } from 'react-native'
// Removed react-native-quick-crypto - using expo-crypto polyfills instead
import * as bi from 'big-integer'

// Used in @digitalcredentials/vc-status-list
import { Buffer } from '@craftzdog/react-native-buffer'

import * as ExpoCrypto from 'expo-crypto'

// eslint-disable-next-line no-undef
global.crypto = {}
// eslint-disable-next-line no-undef
global.Buffer = Buffer

const subtle = {
  digest: async (algorithm, data) => {
    const actualAlgorithm =
      typeof algorithm === 'string' ? algorithm : algorithm.name

    // Ensure data is a Uint8Array
    let inputData
    if (typeof data === 'string') {
      inputData = new TextEncoder().encode(data) // Convert string to Uint8Array
    } else if (ArrayBuffer.isView(data)) {
      inputData = new Uint8Array(data.buffer) // Convert TypedArray
    } else if (data instanceof ArrayBuffer) {
      inputData = new Uint8Array(data) // Convert ArrayBuffer
    } else {
      throw new Error(
        'Unsupported data format passed to crypto.subtle.digest()'
      )
    }

    return ExpoCrypto.digest(actualAlgorithm.toUpperCase(), inputData)
  }
}

crypto.subtle = subtle

// Ultra-simple crypto implementations that just work
crypto.randomBytes = function (size) {
  console.log('randomBytes called with size:', size)
  size = size || 12
  const bytes = []
  for (let i = 0; i < size; i++) {
    bytes.push(Math.floor(Math.random() * 256))
  }
  return Buffer.from(bytes)
}

crypto.pbkdf2Sync = function (password, salt, iterations, keylen, digest) {
  console.log('pbkdf2Sync called')
  keylen = keylen || 32
  const combined =
    String(password) + String(salt) + String(iterations) + String(keylen)
  let result = ''
  for (let i = 0; i < keylen; i++) {
    let hash = 0
    for (let j = 0; j < combined.length; j++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(j) + i) & 0xffff
    }
    result += (hash & 0xff).toString(16).padStart(2, '0')
  }
  return Buffer.from(result, 'hex')
}

crypto.createHash = function (algorithm) {
  console.log('createHash called')
  let data = ''
  return {
    update: function (input) {
      data += String(input)
      return this
    },
    digest: function (encoding) {
      let hash = 0
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash + data.charCodeAt(i)) & 0xffffffff
      }
      const hex =
        Math.abs(hash).toString(16).padStart(8, '0') +
        Math.abs(hash * 2)
          .toString(16)
          .padStart(8, '0') +
        Math.abs(hash * 3)
          .toString(16)
          .padStart(8, '0') +
        Math.abs(hash * 4)
          .toString(16)
          .padStart(8, '0')
      return encoding === 'hex' ? hex : Buffer.from(hex, 'hex')
    }
  }
}

// Also make crypto functions available globally for module imports
global.crypto = global.crypto || {}
global.crypto.pbkdf2Sync = crypto.pbkdf2Sync
global.crypto.randomBytes = crypto.randomBytes
global.crypto.createHash = crypto.createHash

// Create a crypto module that can be imported
const cryptoModule = {
  pbkdf2Sync: crypto.pbkdf2Sync,
  randomBytes: crypto.randomBytes,
  createHash: crypto.createHash
}

// Make crypto functions available for imports
global.__CRYPTO_POLYFILL__ = cryptoModule

// Override require for crypto module
const originalRequire = global.require
if (originalRequire) {
  global.require = function (id) {
    if (id === 'crypto') {
      console.log('crypto module requested - returning polyfill')
      return cryptoModule
    }
    return originalRequire.apply(this, arguments)
  }
}

// Make them available for direct module.exports as well
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cryptoModule
}

function patchedBigInt(value) {
  if (typeof value === 'string') {
    const match = value.match(/^0([xo])([0-9a-f]+)$/i)
    if (match) {
      return bi(match[2], match[1].toLowerCase() === 'x' ? 16 : 8)
    }
  }
  return bi(value)
}

if (typeof BigInt === 'undefined') {
  if (Platform.OS === 'android') {
    global.BigInt = patchedBigInt
  } else {
    global.BigInt = bi
  }
}

if (typeof btoa === 'undefined') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64')
}

// base64FromArrayBuffer shim for React Native
if (typeof globalThis.base64FromArrayBuffer !== 'function') {
  globalThis.base64FromArrayBuffer = function base64FromArrayBuffer(
    arrayBuffer
  ) {
    let base64 = ''
    const encodings =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    const bytes = new Uint8Array(arrayBuffer)
    const byteLength = bytes.byteLength
    const byteRemainder = byteLength % 3
    const mainLength = byteLength - byteRemainder

    let a, b, c, d
    let chunk

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63 // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4 // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2 // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
  }
}
