import * as Keychain from 'react-native-keychain'

export async function storeInBiometricKeychain(key: string): Promise<void> {
  try {
    await Keychain.setGenericPassword('key', key, {
      storage: Keychain.STORAGE_TYPE.RSA,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS
    })
  } catch (err) {
    const { message } = err as Error

    if (message === 'The user name or passphrase you entered is not correct.') {
      throw new Error(
        'Biometric auth currently fails on iOS 15 simulators. See issue: https://github.com/oblador/react-native-keychain/issues/509'
      )
    }
  }
}

export async function retrieveFromBiometricKeychain(): Promise<string> {
  try {
    const result = await Keychain.getGenericPassword({
      storage: Keychain.STORAGE_TYPE.RSA,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      authenticationPrompt: {
        title: 'Authenticate to unlock your wallet.'
      }
    })

    if (result) {
      return result.password
    }

    throw new Error('No key found in biometric keychain.')
  } catch (err) {
    const { message } = err as Error

    if ((await Keychain.getSupportedBiometryType()) === null) {
      throw new Error('Biometrics disabled.')
    }
    if (message === 'The user name or passphrase you entered is not correct.') {
      throw new Error('Invalid biometrics.')
    }
    if (message === 'User canceled the operation.') {
      throw new Error('Authentication was canceled.')
    }

    throw err
  }
}

export async function resetBiometricKeychain(): Promise<void> {
  await Keychain.resetGenericPassword()
}

export async function isBiometricsSupported(): Promise<boolean> {
  const biometryType = await Keychain.getSupportedBiometryType()
  return biometryType !== null
}

const iconBiometryTypes = {
  'face-recognition': [
    Keychain.BIOMETRY_TYPE.FACE,
    Keychain.BIOMETRY_TYPE.FACE_ID,
    Keychain.BIOMETRY_TYPE.IRIS
  ],
  fingerprint: [
    Keychain.BIOMETRY_TYPE.TOUCH_ID,
    Keychain.BIOMETRY_TYPE.FINGERPRINT
  ]
}

type BiometryIconName = keyof typeof iconBiometryTypes

export async function getBiometryIconName(): Promise<BiometryIconName | null> {
  const biometryType = await Keychain.getSupportedBiometryType()
  if (biometryType === null) return null

  const found = Object.entries(iconBiometryTypes).find(([, biometryTypes]) => {
    return biometryTypes.includes(biometryType)
  })

  if (found) {
    const [iconName] = found
    return iconName as BiometryIconName
  }

  return null
}
