import * as Keychain from 'react-native-keychain'
import {
  storeInBiometricKeychain,
  retrieveFromBiometricKeychain,
  resetBiometricKeychain,
  isBiometricsSupported,
  getBiometryIconName
} from '../app/lib/biometrics'

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  STORAGE_TYPE: { RSA: 'RSA' },
  ACCESS_CONTROL: { BIOMETRY_ANY: 'BIOMETRY_ANY' },
  AUTHENTICATION_TYPE: { BIOMETRICS: 'BIOMETRICS' },
  BIOMETRY_TYPE: {
    FACE: 'Face',
    FACE_ID: 'FaceID',
    IRIS: 'Iris',
    TOUCH_ID: 'TouchID',
    FINGERPRINT: 'Fingerprint'
  }
}))

describe('biometrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('storeInBiometricKeychain', () => {
    it('should store key successfully', async () => {
      ;(Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true)

      await expect(
        storeInBiometricKeychain('test-key')
      ).resolves.toBeUndefined()
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'key',
        'test-key',
        {
          storage: 'RSA',
          accessControl: 'BIOMETRY_ANY',
          authenticationType: 'BIOMETRICS'
        }
      )
    })

    it('should handle iOS 15 simulator error', async () => {
      const error = new Error(
        'The user name or passphrase you entered is not correct.'
      )
      ;(Keychain.setGenericPassword as jest.Mock).mockRejectedValue(error)

      await expect(storeInBiometricKeychain('test-key')).rejects.toThrow(
        'Biometric auth currently fails on iOS 15 simulators'
      )
    })

    it('should handle other errors silently', async () => {
      const error = new Error('Other error')
      ;(Keychain.setGenericPassword as jest.Mock).mockRejectedValue(error)

      await expect(
        storeInBiometricKeychain('test-key')
      ).resolves.toBeUndefined()
    })
  })

  describe('retrieveFromBiometricKeychain', () => {
    it('should retrieve key successfully', async () => {
      ;(Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        password: 'stored-key'
      })

      const result = await retrieveFromBiometricKeychain()
      expect(result).toBe('stored-key')
    })

    it('should throw error when no key found', async () => {
      ;(Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false)

      await expect(retrieveFromBiometricKeychain()).rejects.toThrow(
        'No key found in biometric keychain.'
      )
    })

    it('should handle biometrics disabled', async () => {
      ;(Keychain.getGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Some error')
      )
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null)

      await expect(retrieveFromBiometricKeychain()).rejects.toThrow(
        'Biometrics disabled.'
      )
    })

    it('should handle invalid biometrics', async () => {
      const error = new Error(
        'The user name or passphrase you entered is not correct.'
      )
      ;(Keychain.getGenericPassword as jest.Mock).mockRejectedValue(error)
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        'TouchID'
      )

      await expect(retrieveFromBiometricKeychain()).rejects.toThrow(
        'Invalid biometrics.'
      )
    })

    it('should handle user cancellation', async () => {
      const error = new Error('User canceled the operation.')
      ;(Keychain.getGenericPassword as jest.Mock).mockRejectedValue(error)
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        'TouchID'
      )

      await expect(retrieveFromBiometricKeychain()).rejects.toThrow(
        'Authentication was canceled.'
      )
    })
  })

  describe('resetBiometricKeychain', () => {
    it('should reset keychain successfully', async () => {
      ;(Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true)

      await expect(resetBiometricKeychain()).resolves.toBeUndefined()
      expect(Keychain.resetGenericPassword).toHaveBeenCalled()
    })
  })

  describe('isBiometricsSupported', () => {
    it('should return true when biometrics supported', async () => {
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        'TouchID'
      )

      const result = await isBiometricsSupported()
      expect(result).toBe(true)
    })

    it('should return false when biometrics not supported', async () => {
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null)

      const result = await isBiometricsSupported()
      expect(result).toBe(false)
    })
  })

  describe('getBiometryIconName', () => {
    it('should return face-recognition for Face ID', async () => {
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        'FaceID'
      )

      const result = await getBiometryIconName()
      expect(result).toBe('face-recognition')
    })

    it('should return fingerprint for Touch ID', async () => {
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        'TouchID'
      )

      const result = await getBiometryIconName()
      expect(result).toBe('fingerprint')
    })

    it('should return null when no biometry supported', async () => {
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null)

      const result = await getBiometryIconName()
      expect(result).toBeNull()
    })

    it('should return null for unknown biometry type', async () => {
      ;(Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        'UnknownType'
      )

      const result = await getBiometryIconName()
      expect(result).toBeNull()
    })
  })
})
