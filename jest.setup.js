jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true)
}))

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash')
  })),
  pbkdf2Sync: jest.fn(() => Buffer.alloc(32, 4)),
  randomBytes: jest.fn((n) => Buffer.alloc(n, 4))
}))

// Also mock react-native-fs with proper jest.fn() support
const mockReadFile = jest.fn().mockImplementation((path, encoding) => {
  // Default fallback based on encoding
  if (encoding === 'base64') {
    if (path === 'fakepath') {
      // Create proper PNG data with embedded JSON
      const pngMagicBytes = '\x89PNG\r\n\x1a\n' // PNG magic bytes
      const embeddedJson = JSON.stringify({
        openbadgecredential: { name: 'Test' }
      })
      const pngWithEmbeddedData =
        pngMagicBytes + `randomtextopenbadgecredential${embeddedJson}`
      return Promise.resolve(
        Buffer.from(pngWithEmbeddedData, 'binary').toString('base64')
      )
    }
    return Promise.resolve('bm90YXBuZw==') // "notapng" in base64
  }

  if (encoding === 'utf8') {
    if (path === 'file.json') {
      return Promise.resolve('{"key":"value"}')
    }
    if (path.includes('test.json') || path.includes('file://')) {
      return Promise.resolve('{"content": "true"}')
    }
    return Promise.resolve('{"default": "content"}')
  }

  return Promise.resolve('')
})

jest.mock('react-native-fs', () => ({
  readFile: mockReadFile,
  writeFile: jest.fn(),
  copyFile: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(true),
  DocumentDirectoryPath: '/mock/document/path',
  CachesDirectoryPath: '/mock/cache/path'
}))

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
  pickSingle: jest.fn(),
  isInProgress: jest.fn()
}))

// Mock react-native-base64 with proper base64 functionality
jest.mock('react-native-base64', () => ({
  decode: jest.fn((str) => {
    try {
      return Buffer.from(str, 'base64').toString('binary')
    } catch {
      return str
    }
  }),
  encode: jest.fn((str) => {
    try {
      return Buffer.from(str, 'binary').toString('base64')
    } catch {
      return str
    }
  })
}))

// Mock react-native-securerandom
jest.mock('react-native-securerandom', () => ({
  generateSecureRandom: jest.fn(() => Promise.resolve(new Uint8Array(32)))
}))

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true)
}))

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() =>
    Promise.resolve({ username: 'test', password: 'test' })
  ),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('TouchID')),
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint'
  }
}))

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  return {
    MaterialIcons: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name }),
    Ionicons: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name }),
    AntDesign: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name }),
    Feather: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name })
  }
})

// Mock react-native-outside-press
jest.mock('react-native-outside-press', () => {
  const React = require('react')
  const MockOutsidePressHandler = ({
    children,
    onOutsidePress,
    disabled,
    ...props
  }) => {
    return React.createElement('View', props, children)
  }
  return {
    __esModule: true,
    default: MockOutsidePressHandler
  }
})

// Mock react-native-elements
jest.mock('react-native-elements', () => {
  const React = require('react')
  return {
    Button: ({ title, onPress, ...props }) =>
      React.createElement('Button', { ...props, onPress, children: title }),
    Text: ({ children, ...props }) =>
      React.createElement('Text', props, children)
  }
})

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react')
  return {
    TextInput: ({ value, onChangeText, label, ...props }) =>
      React.createElement('TextInput', {
        ...props,
        value,
        onChangeText,
        testID: label
      })
  }
})

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react')
  return ({ value, size, getRef, ...props }) => {
    React.useImperativeHandle(getRef, () => ({
      toDataURL: (callback) => callback && callback('mock-qr-data')
    }))
    return React.createElement('View', { ...props, testID: 'qr-code' })
  }
})

// Mock @react-native-clipboard/clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve(''))
}))

// Mock react-native-share
jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve())
}))

// Mock rn-animated-ellipsis
jest.mock('rn-animated-ellipsis', () => {
  const React = require('react')
  return ({ style, ...props }) =>
    React.createElement('View', { ...props, style })
})

// Global React Native mock setup
global.mockNativeModules = {
  RNVectorIconsManager: {},
  RNKeychainManager: {
    setInternetCredentials: jest.fn(() => Promise.resolve()),
    getInternetCredentials: jest.fn(() =>
      Promise.resolve({ username: 'test', password: 'test' })
    ),
    resetInternetCredentials: jest.fn(() => Promise.resolve())
  },
  RNSecureRandom: {
    generateSecureRandom: jest.fn(() => Promise.resolve(new Uint8Array(32)))
  }
}

// Global setup for native modules only
global.NativeModules = global.mockNativeModules

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(() => jest.fn()),
  useSelector: jest.fn(),
  Provider: ({ children }) => children
}))

// Mock AccessibleView component specifically
jest.mock(
  '../app/components/AccessibleView/AccessibleView',
  () => {
    const React = require('react')
    const AccessibleView = React.forwardRef(
      ({ children, onPress, label, ...props }, ref) => {
        return React.createElement(
          'View',
          {
            ...props,
            ref,
            onPress,
            accessibilityLabel: label,
            accessible: true
          },
          children
        )
      }
    )
    AccessibleView.displayName = 'AccessibleView'
    return {
      __esModule: true,
      default: AccessibleView
    }
  },
  { virtual: true }
)

// Mock other components that ProfileItem depends on
jest.mock(
  '../app/components/MoreMenuButton/MoreMenuButton',
  () => {
    const React = require('react')
    return ({ children }) =>
      React.createElement('View', { testID: 'more-menu' }, children)
  },
  { virtual: true }
)

jest.mock(
  '../app/components/MenuItem/MenuItem',
  () => {
    const React = require('react')
    return ({ title, onPress }) =>
      React.createElement('View', { onPress, testID: `menu-${title}` }, title)
  },
  { virtual: true }
)

jest.mock(
  '../app/components/ConfirmModal/ConfirmModal',
  () => {
    const React = require('react')
    return ({
      title,
      children,
      onConfirm,
      onCancel,
      onRequestClose,
      cancelButton = true
    }) =>
      React.createElement(
        'View',
        { testID: 'confirm-modal' },
        React.createElement('View', { testID: 'modal-title' }, title),
        React.createElement(
          'View',
          { onPress: onConfirm, testID: 'confirm' },
          'confirm'
        ),
        cancelButton
          ? React.createElement(
              'View',
              { onPress: onCancel || onRequestClose, testID: 'cancel' },
              'cancel'
            )
          : null,
        children
      )
  },
  { virtual: true }
)

jest.mock(
  '../app/components/BackupItemModal/BackupItemModal',
  () => {
    const React = require('react')
    return ({ title, onBackup, onRequestClose }) =>
      React.createElement(
        'View',
        { testID: 'backup-modal' },
        React.createElement(
          'View',
          { testID: 'backup-title' },
          title || 'Backup'
        ),
        React.createElement(
          'View',
          { onPress: onBackup, testID: 'backup-do' },
          'backup'
        ),
        React.createElement(
          'View',
          { onPress: onRequestClose, testID: 'backup-close' },
          'close'
        )
      )
  },
  { virtual: true }
)

// Mock app hooks
jest.mock(
  '../app/hooks/useAppDispatch',
  () => ({
    useAppDispatch: jest.fn(() => jest.fn())
  }),
  { virtual: true }
)

jest.mock(
  '../app/hooks/useDynamicStyles',
  () => ({
    useDynamicStyles: jest.fn(() => ({
      styles: {
        container: {},
        textContainer: {},
        titleText: {},
        subtitleText: {},
        input: {},
        underline: {},
        buttonContainer: {},
        buttonContainerActive: {},
        menuContainer: {}
      },
      theme: {
        color: {
          textPrimary: '#000',
          inputInactive: '#999',
          brightAccent: '#007AFF'
        }
      },
      mixins: {
        modalBodyText: {},
        buttonClear: {},
        buttonClearTitle: {},
        buttonClearContainer: {},
        headerIcon: {},
        shadow: {}
      }
    }))
  }),
  { virtual: true }
)

// Mock store slices
jest.mock(
  '../app/store/slices/profile',
  () => ({
    deleteProfile: jest.fn((payload) => ({ type: 'profile/delete', payload })),
    updateProfile: jest.fn((payload) => ({ type: 'profile/update', payload }))
  }),
  { virtual: true }
)

// Mock lib functions
jest.mock(
  '../app/lib/export',
  () => ({
    exportProfile: jest.fn()
  }),
  { virtual: true }
)

jest.mock(
  '../app/lib/error',
  () => ({
    errorMessageFrom: jest.fn((err) => err.message || 'Unknown error')
  }),
  { virtual: true }
)

jest.mock(
  '../app/lib/text',
  () => ({
    fmtCredentialCount: jest.fn(
      (count) => `${count} credential${count !== 1 ? 's' : ''}`
    )
  }),
  { virtual: true }
)

// Mock navigation
jest.mock(
  '../app/navigation/navigationRef',
  () => ({
    navigationRef: {
      isReady: jest.fn(() => true),
      navigate: jest.fn()
    }
  }),
  { virtual: true }
)
