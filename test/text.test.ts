import { fmtCredentialCount } from '../app/lib/text'

describe('text utilities', () => {
  describe('fmtCredentialCount', () => {
    it('should return singular form for count of 1', () => {
      expect(fmtCredentialCount(1)).toBe('1 credential')
    })

    it('should return plural form for count of 0', () => {
      expect(fmtCredentialCount(0)).toBe('0 credentials')
    })

    it('should return plural form for count greater than 1', () => {
      expect(fmtCredentialCount(2)).toBe('2 credentials')
      expect(fmtCredentialCount(10)).toBe('10 credentials')
    })
  })
})
