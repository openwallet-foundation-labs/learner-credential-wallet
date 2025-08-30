// app/shims/verifierCore.ts
let _core: any | undefined;
let _loadedFrom = 'unknown';

function hasFns(m: any) {
  return !!(m && typeof m.verifyCredential === 'function' && typeof m.verifyPresentation === 'function');
}
function pickCore(mod: any) {
  const candidates = [mod, (mod && mod.default)];
  for (const c of candidates) if (hasFns(c)) return c;
  return undefined;
}

function loadCore() {
  if (_core) return _core;

  let mod: any | undefined;
  try { mod = require('@digitalcredentials/verifier-core/dist/Verify.js'); _loadedFrom = 'dist/Verify.js'; } catch {
    // Try next fallback path
  }
  if (!mod) { try { mod = require('@digitalcredentials/verifier-core/dist/index.js'); _loadedFrom = 'dist/index.js'; } catch {
    // Try next fallback path
  } }
  if (!mod) { try { mod = require('@digitalcredentials/verifier-core/index.js'); _loadedFrom = 'index.js'; } catch {
    // Try next fallback path
  } }
  if (!mod) { try { mod = require('@digitalcredentials/verifier-core'); _loadedFrom = '(package root)'; } catch {
    // All fallback paths exhausted
  } }

  const core = pickCore(mod);
  if (!core) {
    const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
    console.warn('[verifierCore shim] failed to locate exports. tried:', _loadedFrom, 'keys=', keys);
    throw new Error('[verifierCore shim] verifyCredential/verifyPresentation not found.');
  }
  _core = core;
  try {
    console.log('[verifierCore shim] loaded from:', _loadedFrom, 'exports=', Object.keys(_core));
  } catch {
    // Ignore logging errors
  }
  return _core;
}

export async function verifyCredential(opts: any) {
  const t0 = Date.now();
  try {
    const out = await loadCore().verifyCredential(opts);
    console.log('[verifierCore shim] verifyCredential ok in', Date.now() - t0, 'ms');
    return out;
  } catch (e) {
    console.warn('[verifierCore shim] verifyCredential error in', Date.now() - t0, 'ms', e);
    throw e;
  }
}
export async function verifyPresentation(opts: any) {
  const t0 = Date.now();
  try {
    const out = await loadCore().verifyPresentation(opts);
    console.log('[verifierCore shim] verifyPresentation ok in', Date.now() - t0, 'ms');
    return out;
  } catch (e) {
    console.warn('[verifierCore shim] verifyPresentation error in', Date.now() - t0, 'ms', e);
    throw e;
  }
}
