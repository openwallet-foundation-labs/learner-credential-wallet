// app/shims/vc.ts
// RN/Hermes-safe wrapper for @digitalcredentials/vc.
// Normalizes ESM/CJS export shapes and avoids import-time side effects.

let _vc: { createPresentation: Function; signPresentation: Function } | undefined;

function loadVC() {
  if (_vc) return _vc;

  // Some linked-data libs expect this to exist; our shim guarantees the shape.
  try { require('base64url-universal'); } catch {
    // Ignore if module is not available
  }

  // Force-load the library and normalize its exports
  // (Metro + our metro.config.js should route this to a CJS build.)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('@digitalcredentials/vc');
  const mod = (m && m.default) ? m.default : m;

  const createPresentation =
    (mod && mod.createPresentation) || (m && m.createPresentation);
  const signPresentation =
    (mod && mod.signPresentation) || (m && m.signPresentation);

  if (typeof createPresentation !== 'function' || typeof signPresentation !== 'function') {
    const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
    console.warn('[vc shim] unexpected export shape. keys =', keys);
    throw new Error('[vc shim] createPresentation/signPresentation not found');
  }

  _vc = { createPresentation, signPresentation };
  return _vc;
}

export function createPresentation(args: any) {
  return loadVC().createPresentation(args);
}

export function signPresentation(args: any) {
  return loadVC().signPresentation(args);
}
