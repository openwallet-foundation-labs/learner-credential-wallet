import {
  HumanReadableError,
  errorMessageFrom,
  errorMessageMatches
} from '../app/lib/error'

describe('error utilities', () => {
  describe('HumanReadableError', () => {
    it('should create error with correct message and name', () => {
      const message = 'Test error message'
      const error = new HumanReadableError(message)

      expect(error.message).toBe(message)
      expect(error.name).toBe('HumanReadableError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('errorMessageFrom', () => {
    it('should return message from HumanReadableError', () => {
      const message = 'Human readable error'
      const error = new HumanReadableError(message)

      const result = errorMessageFrom(error)
      expect(result).toBe(message)
    })

    it('should return fallback for regular Error', () => {
      const error = new Error('Regular error')
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = errorMessageFrom(error)
      expect(result).toBe('Something went wrong')
      expect(consoleSpy).toHaveBeenCalledWith(error)

      consoleSpy.mockRestore()
    })

    it('should return custom fallback for regular Error', () => {
      const error = new Error('Regular error')
      const customFallback = 'Custom fallback message'
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = errorMessageFrom(error, customFallback)
      expect(result).toBe(customFallback)

      consoleSpy.mockRestore()
    })

    it('should handle non-Error objects', () => {
      const nonError = { someProperty: 'value' }
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = errorMessageFrom(nonError)
      expect(result).toBe('Something went wrong')
      expect(consoleSpy).toHaveBeenCalledWith(nonError)

      consoleSpy.mockRestore()
    })
  })

  describe('errorMessageMatches', () => {
    it('should return true when error message contains single match string', () => {
      const error = new Error('Network connection failed')

      const result = errorMessageMatches(error, 'connection')
      expect(result).toBe(true)
    })

    it('should return false when error message does not contain match string', () => {
      const error = new Error('Network connection failed')

      const result = errorMessageMatches(error, 'timeout')
      expect(result).toBe(false)
    })

    it('should return true when error message contains one of multiple match strings', () => {
      const error = new Error('Network connection failed')

      const result = errorMessageMatches(error, [
        'timeout',
        'connection',
        'refused'
      ])
      expect(result).toBe(true)
    })

    it('should return false when error message contains none of multiple match strings', () => {
      const error = new Error('Network connection failed')

      const result = errorMessageMatches(error, [
        'timeout',
        'refused',
        'denied'
      ])
      expect(result).toBe(false)
    })

    it('should handle empty array of match strings', () => {
      const error = new Error('Network connection failed')

      const result = errorMessageMatches(error, [])
      expect(result).toBe(false)
    })

    it('should handle partial string matches', () => {
      const error = new Error('Authentication failed')

      expect(errorMessageMatches(error, 'Auth')).toBe(true)
      expect(errorMessageMatches(error, 'failed')).toBe(true)
      expect(errorMessageMatches(error, 'success')).toBe(false)
    })
  })
})
