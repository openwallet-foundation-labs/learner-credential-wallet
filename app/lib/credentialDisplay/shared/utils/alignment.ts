import { IAlignment } from '@digitalcredentials/ssi';

export type ValidAlignment = {
  targetName: string;
  targetUrl?: string;
  targetDescription?: string;
  isValidUrl?: boolean;
};

function normalizeUrl(raw: string): string {
  const trimmed = String(raw).trim();
  // If it already has a scheme (e.g., http:, https)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  // Otherwise, assume https
  return `https://${trimmed}`;
}

function isStrictHttpUrl(raw: string): string | null {
  const candidate = String(raw).trim();

  if (candidate.length === 0) return null;
  if (/\s/.test(candidate)) return null;

  const normalized = normalizeUrl(candidate);

  // Reject strings that embed multiple schemes
  const firstSchemeIdx = normalized.indexOf('://');
  if (firstSchemeIdx === -1) return null;
  if (normalized.indexOf('://', firstSchemeIdx + 3) !== -1) return null;

  try {
    const u = new URL(normalized);
    // Only allow http(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    // Must have a hostname
    if (!u.hostname) return null;
    // Forbid credentials/userinfo
    if (u.username || u.password) return null;
    // Hostname must be reasonable (letters, numbers, dashes, dots) or be 'localhost' or an IPv4
    const isHostname = /^[A-Za-z0-9.-]+$/.test(u.hostname);
    const isLocalhost = u.hostname.toLowerCase() === 'localhost';
    const isIPv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(u.hostname);
    if (!(isHostname || isLocalhost || isIPv4)) return null;
    // If it's a standard hostname (not localhost/IP), require at least one dot
    if (isHostname && !isLocalhost && !isIPv4 && !u.hostname.includes('.')) return null;

    return normalized;
  } catch {
    return null;
  }
}

export function getValidAlignments(alignments?: IAlignment[]): ValidAlignment[] {
  if (!alignments || !Array.isArray(alignments)) {
    return [];
  }

  return alignments
    .filter((alignment) => {
      // targetName is required for display
      return !!alignment.targetName;
    })
    .map(alignment => {
      const result: ValidAlignment = {
        targetName: alignment.targetName!,
        targetDescription: alignment.targetDescription,
      };

      if (alignment.targetUrl) {
        const normalizedUrl = isStrictHttpUrl(alignment.targetUrl);
        result.targetUrl = alignment.targetUrl;
        result.isValidUrl = !!normalizedUrl;
      }

      return result;
    });
}
