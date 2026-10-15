import { delay } from '../app/lib/time'

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
})
