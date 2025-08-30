import { VerifiablePresentation, PresentationError } from '../types/presentation';
import { Credential, CredentialError } from '../types/credential';

// Shimmed verifier-core
import {
  verifyCredential as coreVerifyCredential,
  verifyPresentation as coreVerifyPresentation,
} from '../shims/verifierCore';

// JSON-LD / security loader + did:key driver
import { buildBaseSecurityLoader } from '../shims/securityLoader';
import { getDidMethodKey } from '../shims/didMethodKey';

// =====================
// Debug toggle
// =====================
const DCC_DEBUG =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_DCC_DEBUG === '1') ||
  true;

function dbg(...args: any[]) {
  if (DCC_DEBUG) console.log('[validate]', ...args);
}
function warn(...args: any[]) {
  console.warn('[validate]', ...args);
}

export type ResultLog = {
  id: string;
  valid: boolean;
  error?: any;
};

export type Result = {
  verified: boolean;
  credential: Credential;
  error: CredentialError;
  log: ResultLog[];
};

export type VerifyResponse = {
  verified: boolean;
  results: Result[];
};

type JsonLdDoc = { contextUrl: null; documentUrl: string; document: any };
type DocumentLoader = (url: string) => Promise<JsonLdDoc>;

export async function verifyPresentation(
  presentation: VerifiablePresentation,
): Promise<VerifyResponse> {
  try {
    const t0 = Date.now();
    const result = await coreVerifyPresentation({ presentation });
    dbg('verifyPresentation took', Date.now() - t0, 'ms verified=', result?.verified);
    if (!result.verified) warn('VP not verified:', JSON.stringify(result, null, 2));
    return result as VerifyResponse;
  } catch (err) {
    warn('verifyPresentation error', err);
    throw new Error(PresentationError.CouldNotBeVerified);
  }
}

export async function verifyCredential(credential: Credential): Promise<VerifyResponse> {
  // Fetch registries
  let knownDIDRegistries: any[] | undefined;
  try {
    const t0 = Date.now();
    const response = await fetch(
      'https://digitalcredentials.github.io/dcc-known-registries/known-did-registries.json',
    );
    if (response?.ok) {
      knownDIDRegistries = await response.json();
      console.log(
        '[validate] registries fetched OK in',
        Date.now() - t0,
        'ms count=',
        Array.isArray(knownDIDRegistries) ? knownDIDRegistries.length : 'n/a',
      );
    } else {
      warn('[validate] registries HTTP error status=', response?.status);
    }
  } catch (e) {
    warn('[validate] registries fetch failed', e);
  }

  // Build documentLoader (base + did:key)
  const baseRaw = buildBaseSecurityLoader(true);
  if (!baseRaw) throw new Error('securityLoader not available');
  const baseLoader: DocumentLoader = baseRaw as DocumentLoader;

  const DidMethodKey = getDidMethodKey();
  const didKeyDriver = DidMethodKey.driver();

  const documentLoader: DocumentLoader = async (url: string) => {
    const t0 = Date.now();
    try {
      if (typeof url === 'string' && url.startsWith('did:key:')) {
        const { didDocument } = await didKeyDriver.get({ did: url });
        console.log(
          '[validate] documentLoader did:key ok',
          url.slice(0, 30) + '...',
          'in',
          Date.now() - t0,
          'ms',
        );
        return { contextUrl: null, documentUrl: url, document: didDocument };
      }
      const out = await baseLoader(url);
      if (url.includes('credentials') || url.includes('ed25519') || url.includes('/ob/')) {
        console.log('[validate] documentLoader context ok', url, 'in', Date.now() - t0, 'ms');
      }
      return out;
    } catch (e) {
      warn('[validate] documentLoader failed for', url, e);
      throw e;
    }
  };

  // If a VP was accidentally passed, unwrap the first VC
const input = (credential as any)?.verifiableCredential?.[0] ?? credential;

// Preflight all contexts used by the shared VC
await documentLoader('https://www.w3.org/2018/credentials/v1');
await documentLoader('https://www.w3.org/ns/credentials/status/v1');
await documentLoader('https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.1.json');
// keep your existing preflights:
await documentLoader('https://www.w3.org/ns/credentials/v2');
await documentLoader('https://w3id.org/security/suites/ed25519-2020/v1');

// If the VM is a did:key, warm it:
const vm = (input as any)?.proof?.verificationMethod || (input as any)?.issuer?.id;
if (typeof vm === 'string' && vm.startsWith('did:key:')) {
  await documentLoader(vm);
}


  // Preflight: contexts + did:key
  try {
    await documentLoader('https://www.w3.org/ns/credentials/v2');
    await documentLoader('https://w3id.org/security/suites/ed25519-2020/v1');
    await documentLoader('https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json');

    const vm = (credential as any)?.proof?.verificationMethod || (credential as any)?.issuer?.id;
    if (typeof vm === 'string' && vm.startsWith('did:key:')) {
      await documentLoader(vm);
    }
    console.log('[validate] preflight ok (v2, ed25519-2020, OB, did:key)');
    logLoadedVersions();
  } catch (e) {
    warn('[verify preflight] documentLoader failed:', e);
  }

  // Extra: status list reachability
  try {
    const slc = (credential as any)?.credentialStatus?.statusListCredential;
    if (typeof slc === 'string') {
      const t0 = Date.now();
      const r = await fetch(slc);
      console.log(
        '[validate] statusListCredential fetch',
        slc,
        'ok=',
        r.ok,
        'status=',
        r.status,
        'in',
        Date.now() - t0,
        'ms',
      );
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        warn('[validate] statusListCredential body(head)=', text.slice(0, 120));
      }
    }
  } catch (e) {
    warn('[validate] statusListCredential fetch failed', e);
  }

  try {
    const t0 = Date.now();
    const result: any = await coreVerifyCredential({
      credential: input,
      knownDIDRegistries,
      knownDidRegistries: knownDIDRegistries, // version drift cover
      reloadIssuerRegistry: true,
      documentLoader,
    });
    console.log('[validate] coreVerifyCredential took', Date.now() - t0, 'ms');

    // Surface nested error.log if present
    if (result?.results?.[0]?.error?.log) {
      result.results[0].log = result.results[0].error.log;
      console.log(
        '[validate] results[0].error.log surfaced: entries=',
        Array.isArray(result.results[0].log) ? result.results[0].log.length : 'n/a',
      );
    }
    if (result?.results?.[0]?.error && !result?.results?.[0]?.log) {
      console.warn(
        '[validate] results[0].error (expanded)=',
        JSON.stringify(expandError(result.results[0].error), removeStackReplacer, 2),
      );
    }

    // Adopt logs or synthesize from top-level errors
    if (typeof result.log === 'undefined') {
      const candidate = result?.results?.[0]?.log;
      if (Array.isArray(candidate)) {
        result.log = candidate;
        console.log('[validate] adopted results[0].log → result.log entries=', candidate.length);
      } else if (Array.isArray(result?.errors) && result.errors.length > 0) {
        const expanded = result.errors.map((err: any) => expandError(err));
        result.log = expanded.map((err: any) => ({
          id: String(err?.name ?? 'unknown_error'),
          valid: false,
          error: err,
        }));
        console.log(
          '[validate] synthesized result.log from top-level errors count=',
          result.errors.length,
          'firstError=',
          JSON.stringify(expandError(result.errors[0]), removeStackReplacer, 2),
        );
      } else {
        warn('[validate] no log, no errors in verify response');
        throw result.error || new Error('Verify response does not a `log` value');
      }
    }

    // --- DIAGNOSTIC FALLBACK (safe & guarded) ---
    try {
      const onlyUnknown =
        Array.isArray(result.log) &&
        result.log.length === 1 &&
        result.log[0]?.id === 'unknown_error';

      if (onlyUnknown) {
        const diag: ResultLog[] = [];

        // D1) proof prerequisites
        const proof = (credential as any)?.proof ?? {};
        const proofTypeOk = proof?.type === 'Ed25519Signature2020';
        const vm2 = proof?.verificationMethod;
        const vmIsDidKey = typeof vm2 === 'string' && vm2.startsWith('did:key:');
        diag.push({
          id: 'diag_proof_prereqs',
          valid: !!proofTypeOk && !!vmIsDidKey,
          error:
            !proofTypeOk || !vmIsDidKey
              ? { name: 'proof_prereqs_failed', message: `type=${proof?.type}, vmStartsWithDidKey=${vmIsDidKey}` }
              : undefined,
        });

        // D2) context present
        try {
          await documentLoader('https://w3id.org/security/suites/ed25519-2020/v1');
          diag.push({ id: 'diag_ctx_ed25519_2020', valid: true });
        } catch (e) {
          diag.push({
            id: 'diag_ctx_ed25519_2020',
            valid: false,
            error: { name: 'ctx_load_failed', message: String(e) },
          });
        }

        // D3) expiration (local)
        try {
          const now = new Date();
          const vf = (credential as any)?.validFrom ? new Date((credential as any).validFrom) : null;
          const vu = (credential as any)?.validUntil ? new Date((credential as any).validUntil) : null;
          const notYetValid = !!(vf && now < vf);
          const isExpired = !!(vu && now > vu);
          const ok = !notYetValid && !isExpired;
          diag.push({
            id: 'expiration',
            valid: ok,
            error: ok
              ? undefined
              : {
                  name: notYetValid ? 'not_yet_valid' : 'expired',
                  message: `now=${now.toISOString()} validFrom=${vf?.toISOString() ?? 'n/a'} validUntil=${vu?.toISOString() ?? 'n/a'}`,
                },
          });
        } catch (e) {
          diag.push({
            id: 'expiration',
            valid: false,
            error: { name: 'expiration_check_failed', message: String(e) },
          });
        }

        // D4) revocation list reachability (record)
        try {
          const slc2 = (credential as any)?.credentialStatus?.statusListCredential;
          if (typeof slc2 === 'string') {
            const resp = await fetch(slc2);
            diag.push({
              id: 'diag_statuslist_fetch',
              valid: !!resp?.ok,
              error: resp?.ok ? undefined : { name: 'status_list_fetch_failed', message: `status=${resp?.status}` },
            });
          }
        } catch (e) {
          diag.push({
            id: 'diag_statuslist_fetch',
            valid: false,
            error: { name: 'status_list_fetch_failed', message: String(e) },
          });
        }

        // D5) issuer in registry heuristic
        try {
          const issuerId = (credential as any)?.issuer?.id;
          const inRegistry = Array.isArray(knownDIDRegistries)
            ? knownDIDRegistries.some((r: any) =>
                typeof r?.did === 'string'
                  ? r.did === issuerId
                  : Array.isArray(r?.dids)
                  ? r.dids.includes(issuerId)
                  : false,
              )
            : false;
          diag.push({
            id: 'registered_issuer_heuristic',
            valid: !!inRegistry,
            error: inRegistry ? undefined : { name: 'issuer_not_in_registry', message: `issuer=${issuerId}` },
          });
        } catch (e) {
          diag.push({
            id: 'registered_issuer_heuristic',
            valid: false,
            error: { name: 'issuer_registry_check_failed', message: String(e) },
          });
        }

        // Ensure results container exists before pushing
        if (!Array.isArray(result.results) || !result.results[0]) {
          result.results = [
            {
              verified: false,
              log: [],
              credential: result.credential ?? credential,
            } as any,
          ];
        }
        if (!Array.isArray(result.results[0].log)) result.results[0].log = [];
        // Append diagnostics both places (top-level + results[0])
        if (Array.isArray(result.log)) result.log.push(...diag);
        (result.results[0].log as ResultLog[]).push(...diag);

        console.log(
          '[validate] diag summary →',
          diag.map((d) => `${d.id}:${d.valid ? '✓' : '✗'}`).join(' | '),
        );
      }
    } catch (e) {
      warn('[validate] diagnostic fallback failed', e);
    }
    // --- END DIAGNOSTIC FALLBACK ---

    // Compute verified (main semantics)
    result.verified = Array.isArray(result.log)
      ? result.log.every((check: { valid: any }) => check.valid)
      : false;

    // Ensure results array (as in main)
    if (!result.results) {
      result.results = [
        {
          verified: (result.log as ResultLog[]).every((check) => check.valid),
          log: result.log,
          credential: result.credential ?? credential,
        },
      ];
    }

    // Revocation handling (unchanged)
    if (result?.verified === false) {
      const revocationIndex = (result.log as ResultLog[]).findIndex((c) => c.id === 'revocation_status');
      if (revocationIndex !== -1) {
        const revocationObject = (result.log as ResultLog[])[revocationIndex];
        if (revocationObject?.error?.name === 'status_list_not_found') {
          (result.log as ResultLog[]).splice(revocationIndex, 1);
          result.verified = (result.log as ResultLog[]).every((log) => log.valid);
        } else {
          const revocationResult = { id: 'revocation_status', valid: revocationObject.valid ?? false };
          (result.results[0].log ??= []).push(revocationResult);
          (result as any).hasStatusError = !!revocationObject?.error;
        }
      }
    }

    // Summarize checks
    if (Array.isArray(result.log)) {
      const summary = (result.log as ResultLog[]).map(
        (l) => `${l.id}:${l.valid ? '✓' : '✗'}${l?.error?.name ? `(${l.error.name})` : ''}`,
      );
      console.log('[validate] log summary →', summary.join(' | '));
    }

    if (!result.verified) {
      warn('[validate] VC not verified:', JSON.stringify(result, removeStackReplacer, 2));
    }
    return result as VerifyResponse;
  } catch (err) {
    warn('[validate] verifyCredential catch', err);
    throw new Error(CredentialError.CouldNotBeVerified);
  }
}

function expandError(err: any, depth = 0) {
  if (!err || depth > 4) return err;
  const out: any = {};
  const keys = new Set([
    ...Object.keys(err || {}),
    'name',
    'message',
    'stack',
    'code',
    'type',
    'cause',
  ]);
     for (const k of Array.from(keys)) {
    try {
      const v = (err as any)[k];
      if (k === 'cause' && v && typeof v === 'object') {
        out.cause = expandError(v, depth + 1);
      } else {
        out[k] = v;
      }
    } catch {
      // Ignore property access errors
    }
  }
  if (out.stack && typeof out.stack !== 'string') {
      try {
    out.stack = String(out.stack);
  } catch {
    // Ignore stack conversion errors
  }
  }
  return out;
}

function logLoadedVersions() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vc = require('@digitalcredentials/verifier-core/package.json');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdl = require('@digitalcredentials/security-document-loader/package.json');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const di = require('@digitalcredentials/data-integrity/package.json');
    console.log('[validate] versions', {
      verifierCore: vc.version,
      securityDocumentLoader: sdl.version,
      dataIntegrity: di.version,
    });
  } catch (e) {
    console.log('[validate] versions not fully available', (e as any)?.message || e);
  }
}

function removeStackReplacer(key: string, value: unknown) {
  return key === 'stack' ? '...' : value;
}
