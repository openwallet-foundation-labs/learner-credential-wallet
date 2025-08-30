// app/polyfills.ts
// Ensure Node-like globals for RN/Hermes

// Buffer
import { Buffer as BufferPolyfill } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = BufferPolyfill;
}

// TextEncoder/TextDecoder
// RN 0.79 on Android may still lack these
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TextEncoder as TE, TextDecoder as TD } from 'text-encoding';
if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TE;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = TD as any;
}

if (typeof globalThis.crypto === 'undefined') (globalThis as any).crypto = {};
if (typeof (globalThis as any).crypto.subtle === 'undefined') {
  (globalThis as any).crypto.subtle = {}; // stub: presence only
}

if (typeof (globalThis as any).base64FromArrayBuffer !== 'function') {
  (globalThis as any).base64FromArrayBuffer = (ab: ArrayBuffer | Uint8Array) => {
    const buf = ab instanceof Uint8Array ? Buffer.from(ab) : Buffer.from(new Uint8Array(ab));
    return buf.toString('base64');
  };
}
if (typeof (globalThis as any).base64ToArrayBuffer !== 'function') {
  (globalThis as any).base64ToArrayBuffer = (b64: string) => {
    const buf = Buffer.from(b64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  };
}

// atob/btoa (a few libs poke for these in non-web runtimes)
if (typeof (globalThis as any).atob !== 'function') {
    (globalThis as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
  }
  if (typeof (globalThis as any).btoa !== 'function') {
    (globalThis as any).btoa = (bin: string) => Buffer.from(bin, 'binary').toString('base64');
  }
  
  // Some stacks truthy-check crypto.subtle even if they don’t use it
  if (typeof (globalThis as any).crypto === 'undefined') (globalThis as any).crypto = {};
  if (typeof (globalThis as any).crypto.subtle === 'undefined') {
    (globalThis as any).crypto.subtle = {}; // presence-only stub
  }