import { delay, waitFor } from '../app/lib/time'

describe('time utilities', () => {
  describe('delay', () => {
    it('should resolve after specified milliseconds', async () => {
      const start = Date.now()
      await delay(100)
      const end = Date.now()
      expect(end - start).toBeGreaterThanOrEqual(90)
    })

    it('should handle zero delay', async () => {
      const start = Date.now()
      await delay(0)
      const end = Date.now()
      expect(end - start).toBeLessThan(50)
    })
  })

  describe('waitFor', () => {
    it('resolves true as soon as the condition holds', async () => {
      let calls = 0
      const met = await waitFor(() => ++calls >= 3, {
        timeoutMs: 1000,
        intervalMs: 1
      })
      expect(met).toBe(true)
      expect(calls).toBe(3)
    })

    it('resolves false when the condition never holds', async () => {
      const met = await waitFor(() => false, { timeoutMs: 20, intervalMs: 5 })
      expect(met).toBe(false)
    })
  })
})
