// Crypto polyfill for React Native
import { Buffer } from "@craftzdog/react-native-buffer";

// Ultra-simple crypto implementations
export function randomBytes(size) {
  console.log("randomBytes called with size:", size);
  size = size || 12;
  const bytes = [];
  for (let i = 0; i < size; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return Buffer.from(bytes);
}

export function pbkdf2Sync(password, salt, iterations, keylen, digest) {
  console.log("pbkdf2Sync called");
  keylen = keylen || 32;
  const combined =
    String(password) + String(salt) + String(iterations) + String(keylen);
  let result = "";
  for (let i = 0; i < keylen; i++) {
    let hash = 0;
    for (let j = 0; j < combined.length; j++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(j) + i) & 0xffff;
    }
    result += (hash & 0xff).toString(16).padStart(2, "0");
  }
  return Buffer.from(result, "hex");
}

export function createHash(algorithm) {
  console.log("createHash called");
  let data = "";
  return {
    update: function (input) {
      data += String(input);
      return this;
    },
    digest: function (encoding) {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash + data.charCodeAt(i)) & 0xffffffff;
      }
      const hex =
        Math.abs(hash).toString(16).padStart(8, "0") +
        Math.abs(hash * 2)
          .toString(16)
          .padStart(8, "0") +
        Math.abs(hash * 3)
          .toString(16)
          .padStart(8, "0") +
        Math.abs(hash * 4)
          .toString(16)
          .padStart(8, "0");
      return encoding === "hex" ? hex : Buffer.from(hex, "hex");
    },
  };
}

// Default export
export default {
  randomBytes,
  pbkdf2Sync,
  createHash,
};
