// app/shims/securityLoader.ts
// Builds a base security documentLoader once, RN/Hermes-safe, with minor fallbacks.
// - Aliases OB 3.0.1 -> 3.0.3 (same vocabulary, avoids fetch failures)
// - Adds simple memo cache + debug logs

type JsonLdDoc = { contextUrl: null; documentUrl: string; document: any };
type DocumentLoader = (url: string) => Promise<JsonLdDoc>;

let _documentLoader: DocumentLoader | undefined;

const DCC_DEBUG =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_DCC_DEBUG === '1') || true;

function dbg(...args: any[]) {
  if (DCC_DEBUG) console.log('[security-loader shim]', ...args);
}

export function buildBaseSecurityLoader(fetchRemoteContexts = true): DocumentLoader {
  if (_documentLoader) return _documentLoader;

  // Ensure base64url shim is present before downstream libs touch it.
  try { require('base64url-universal'); } catch {
    // Ignore if module is not available
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('@digitalcredentials/security-document-loader');
  const mod = (m && m.default) ? m.default : m;
  const factory = mod?.securityLoader || mod;

  if (typeof factory !== 'function') {
    const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
    console.warn('[security-loader shim] unexpected export shape. keys =', keys);
    throw new Error('[security-loader shim] securityLoader() not found');
  }

  // Base loader from the library
  const baseLoader: DocumentLoader = factory({ fetchRemoteContexts }).build();

  // Fallbacks/aliases we care about (from the MIT credential you shared):
  // - OB 3.0.1 -> OB 3.0.3
  const OB_301 = 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.1.json';
  const OB_303 = 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json';

  // A tiny memo cache to avoid redundant network/context work
  const cache = new Map<string, Promise<JsonLdDoc>>();

  const wrapped: DocumentLoader = async (url: string) => {
    if (cache.has(url)) return cache.get(url)!;

    const run = async (): Promise<JsonLdDoc> => {
      try {
        // 1) Try requested URL first
        return await baseLoader(url);
      } catch (e1) {
        // 2) If OB 3.0.1 fails, retry with 3.0.3
        if (url === OB_301) {
          try {
            dbg('aliasing OB 3.0.1 -> 3.0.3');
            return await baseLoader(OB_303);
          } catch (e2) {
            dbg('OB 3.0.3 fallback also failed', e2);
            throw e2;
          }
        }
        // 3) Bubble original error
        dbg('documentLoader failed for', url, e1);
        throw e1;
      }
    };

    const p = run();
    cache.set(url, p);
    return p;
  };

  _documentLoader = wrapped;
  return _documentLoader;
}
