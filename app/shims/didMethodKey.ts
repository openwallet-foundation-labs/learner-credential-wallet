// app/shims/didMethodKey.ts
// Lazy RN/Hermes-safe loader for @digitalcredentials/did-method-key

let _mod: any | undefined;

export function getDidMethodKey() {
  if (_mod) return _mod;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('@digitalcredentials/did-method-key');
  const mod = (m && m.default) ? m.default : m;
  // Library usually exposes a .driver() entry
  if (typeof mod?.driver !== 'function') {
    const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
    console.warn('[did-method-key shim] unexpected export shape. keys =', keys);
    throw new Error('[did-method-key shim] driver() not found');
  }
  _mod = mod;
  return _mod;
}
