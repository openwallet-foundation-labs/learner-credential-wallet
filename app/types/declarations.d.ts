declare module '@digitalcredentials/did-io';
declare module '@digitalcredentials/did-method-key';
declare module '@digitalcredentials/vc';
declare module '@digitalcredentials/verifier-core';
declare module '@digitalcredentials/vc-bitstring-status-list';
declare module '@digitalcredentials/vc-status-list';
declare module '@digitalcredentials/vpqr';
declare module '@digitalcredentials/jsonld-signatures';
declare module '@digitalcredentials/x25519-key-agreement-key-2020';
declare module '@digitalcredentials/ed25519-signature-2020' {
  export class Ed25519Signature2020 {
    constructor(options?: unknown)
  }
}
declare module '@digitalcredentials/data-integrity';
declare module '@digitalcredentials/eddsa-rdfc-2022-cryptosuite';
declare module '@digitalcredentials/lru-memoize';
declare module 'jsonld-document-loader';
declare module '@interop/did-web-resolver';
declare module 'json-canonicalize';
declare module 'rn-animated-ellipsis';
declare module 'react-native-html-to-pdf';
declare module 'react-native-keychain';
declare module 'react-native-filereader';
declare module 'react-native-receive-sharing-intent';
declare module 'validator';
declare module '@microsoft/msrcrypto';

declare module 'react-native-base64' {
  export function decode(input: string): string;
  export function encode(input: string): string;
  const base64: { decode: typeof decode; encode: typeof encode };
  export default base64;
}

declare module '*.png';
declare module '*.json';
