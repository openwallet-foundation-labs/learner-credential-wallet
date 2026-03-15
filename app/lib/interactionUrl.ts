const INTERACTION_SCHEME_PREFIX = 'interaction:'

/**
 * Detects whether a URL is a VCALM interaction URL.
 *
 * Two formats:
 * - interaction: scheme: "interaction:https://example.com/path?iuv=1"
 * - HTTPS URL with iuv query param: "https://example.com/path?iuv=1"
 */
export function isInteractionUrl(url: string): boolean {
  if (url.startsWith(INTERACTION_SCHEME_PREFIX)) {
    return true
  }

  try {
    const parsed = new URL(url)
    return parsed.searchParams.has('iuv')
  } catch {
    return false
  }
}

/**
 * Normalizes any interaction URL to the inner HTTPS interaction URL.
 * Accepts any URL that passed isInteractionUrl().
 *
 * - "interaction:https://...?iuv=1" → strips prefix
 * - "interaction:https%3A%2F%2F..." → strips prefix, decodes
 *   (URL-encoded format after interaction: is non-standard but handled
 *    for robustness)
 * - "https://...?iuv=1" → returned as-is
 */
export function parseInteractionUrl(url: string): string {
  if (!url.startsWith(INTERACTION_SCHEME_PREFIX)) {
    return url
  }

  const inner = url.slice(INTERACTION_SCHEME_PREFIX.length)

  // Non-standard: the inner URL may be URL-encoded after the interaction: prefix
  if (inner.startsWith('http%3A') || inner.startsWith('https%3A')) {
    return decodeURIComponent(inner)
  }

  return inner
}

/**
 * Fetches the interaction protocols response from a VCALM interaction URL.
 * Sends GET with Accept: application/json per the VCALM spec.
 * Returns the protocols map (Record<string, string>).
 *
 * Logs a warning if the iuv param value is not '1'.
 * Throws if the response is not ok or the protocols key is missing.
 */
export async function fetchInteractionProtocols(
  interactionUrl: string
): Promise<Record<string, string>> {
  try {
    const parsed = new URL(interactionUrl)
    const iuv = parsed.searchParams.get('iuv')
    if (iuv && iuv !== '1') {
      console.warn(
        `[fetchInteractionProtocols] Unexpected iuv value "${iuv}" (expected "1"). Proceeding anyway.`
      )
    }
  } catch {
    throw new Error(`Invalid interaction URL: ${interactionUrl}`)
  }

  const response = await fetch(interactionUrl, {
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    throw new Error(
      `Interaction URL fetch failed: ${response.status} ${response.statusText}`
    )
  }

  const body = await response.json()

  if (!body.protocols || typeof body.protocols !== 'object') {
    throw new Error('Interaction URL response missing "protocols" map.')
  }

  return body.protocols
}
