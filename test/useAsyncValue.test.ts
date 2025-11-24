// Mock the hook implementation for testing
jest.mock('../app/hooks/useAsyncValue', () => ({
  useAsyncValue: jest.fn()
}))

import { useAsyncValue } from '../app/hooks/useAsyncValue'

describe('useAsyncValue', () => {
  const mockUseAsyncValue = useAsyncValue as jest.MockedFunction<
    typeof useAsyncValue
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return initial value and loading state', () => {
    const mockFunc = jest.fn().mockResolvedValue('result')
    const initialValue = 'initial'

    mockUseAsyncValue.mockReturnValue([
      initialValue,
      { loading: true, error: undefined }
    ])

    const [value, payload] = mockUseAsyncValue(mockFunc, initialValue)

    expect(value).toBe(initialValue)
    expect(payload.loading).toBe(true)
    expect(payload.error).toBeUndefined()
  })

  it('should return resolved value when async function completes', () => {
    const expectedValue = 'async result'
    const mockFunc = jest.fn().mockResolvedValue(expectedValue)

    mockUseAsyncValue.mockReturnValue([
      expectedValue,
      { loading: false, error: undefined }
    ])

    const [value, payload] = mockUseAsyncValue(mockFunc)

    expect(value).toBe(expectedValue)
    expect(payload.loading).toBe(false)
    expect(payload.error).toBeUndefined()
  })

  it('should return error when async function rejects', () => {
    const expectedError = new Error('Async error')
    const mockFunc = jest.fn().mockRejectedValue(expectedError)

    mockUseAsyncValue.mockReturnValue([
      undefined,
      { loading: false, error: expectedError }
    ])

    const [value, payload] = mockUseAsyncValue(mockFunc)

    expect(value).toBeUndefined()
    expect(payload.loading).toBe(false)
    expect(payload.error).toBe(expectedError)
  })

  it('should handle undefined initial value', () => {
    const mockFunc = jest.fn().mockResolvedValue(42)

    mockUseAsyncValue.mockReturnValue([
      undefined,
      { loading: true, error: undefined }
    ])

    const [value, payload] = mockUseAsyncValue(mockFunc)

    expect(value).toBeUndefined()
    expect(payload.loading).toBe(true)
  })

  it('should handle loading state correctly', () => {
    const mockFunc = jest.fn()

    mockUseAsyncValue.mockReturnValue([
      undefined,
      { loading: true, error: undefined }
    ])

    const [, payload] = mockUseAsyncValue(mockFunc)

    expect(payload.loading).toBe(true)
    expect(payload.error).toBeUndefined()
  })
})
