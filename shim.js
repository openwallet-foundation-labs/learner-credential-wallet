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
