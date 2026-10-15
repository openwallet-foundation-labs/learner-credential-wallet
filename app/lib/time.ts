export const delay = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Polls `condition` until it returns true, checking every `intervalMs` up to
 * `timeoutMs`. Resolves to whether the condition was met.
 */
export async function waitFor(
  condition: () => boolean,
  { timeoutMs = 2000, intervalMs = 100 } = {}
): Promise<boolean> {
  const attempts = Math.max(1, Math.ceil(timeoutMs / intervalMs))
  for (let i = 0; i < attempts; i++) {
    if (condition()) return true
    await delay(intervalMs)
  }
  return condition()
}
