import { Platform } from 'react-native';
import 'react-native-quick-crypto';
import * as bi from 'big-integer';

// Used in @digitalcredentials/vc-status-list
import { Buffer } from '@craftzdog/react-native-buffer';

import * as ExpoCrypto from 'expo-crypto';

// eslint-disable-next-line no-undef
global.crypto = {};
// eslint-disable-next-line no-undef
global.Buffer = Buffer;

const subtle = {
  digest: async (algorithm, data) => {
    const actualAlgorithm =
      typeof algorithm === 'string' ? algorithm : algorithm.name;

    // 🔥 Ensure data is a Uint8Array
    let inputData;
    if (typeof data === 'string') {
      inputData = new TextEncoder().encode(data); // Convert string to Uint8Array
    } else if (ArrayBuffer.isView(data)) {
      inputData = new Uint8Array(data.buffer); // Convert TypedArray
    } else if (data instanceof ArrayBuffer) {
      inputData = new Uint8Array(data); // Convert ArrayBuffer
    } else {
      throw new Error(
        'Unsupported data format passed to crypto.subtle.digest()'
      );
    }

    return ExpoCrypto.digest(actualAlgorithm.toUpperCase(), inputData);
  },
};

crypto.subtle = subtle;

function patchedBigInt(value) {
  if (typeof value === 'string') {
    const match = value.match(/^0([xo])([0-9a-f]+)$/i);
    if (match) {
      return bi(match[2], match[1].toLowerCase() === 'x' ? 16 : 8);
    }
  }
  return bi(value);
}

if (typeof BigInt === 'undefined') {
  if (Platform.OS === 'android') {
    global.BigInt = patchedBigInt;
  } else {
    global.BigInt = bi;
  }
}

if (typeof btoa === 'undefined') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

// base64FromArrayBuffer shim for React Native
if (typeof globalThis.base64FromArrayBuffer !== 'function') {
  globalThis.base64FromArrayBuffer = function base64FromArrayBuffer(arrayBuffer) {
    let base64 = '';
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    const bytes = new Uint8Array(arrayBuffer);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let a, b, c, d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63; // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4; // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2; // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64;
  };
}
