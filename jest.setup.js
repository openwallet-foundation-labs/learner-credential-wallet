jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("crypto", () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => "mocked-hash"),
  })),
  pbkdf2Sync: jest.fn(() => Buffer.alloc(32, 4)),
  randomBytes: jest.fn((n) => Buffer.alloc(n, 4)),
}));

// Mock Platform for tests that access Platform.OS directly
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    select: (objs) => objs.ios || objs.default,
  },
  NativeModules: {},
  PermissionsAndroid: {
    request: jest.fn(),
    check: jest.fn(),
    PERMISSIONS: {
      CAMERA: 'android.permission.CAMERA',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
  },
}));

// Also mock react-native-fs with proper jest.fn() support
const mockReadFile = jest.fn().mockImplementation((path, encoding) => {
  // Default fallback based on encoding
  if (encoding === 'base64') {
    if (path === 'fakepath') {
      // Create proper PNG data with embedded JSON
      const pngMagicBytes = '\x89PNG\r\n\x1a\n'; // PNG magic bytes
      const embeddedJson = JSON.stringify({ openbadgecredential: { name: 'Test' } });
      const pngWithEmbeddedData = pngMagicBytes + `randomtextopenbadgecredential${embeddedJson}`;
      return Promise.resolve(Buffer.from(pngWithEmbeddedData, 'binary').toString('base64'));
    }
    return Promise.resolve('bm90YXBuZw=='); // "notapng" in base64
  }
  
  if (encoding === 'utf8') {
    if (path === 'file.json') {
      return Promise.resolve('{"key":"value"}');
    }
    if (path.includes('test.json') || path.includes('file://')) {
      return Promise.resolve('{"content": "true"}');
    }
    return Promise.resolve('{"default": "content"}');
  }
  
  return Promise.resolve('');
});

jest.mock("react-native-fs", () => ({
  readFile: mockReadFile,
  writeFile: jest.fn(),
  copyFile: jest.fn().mockResolvedValue(true),
  exists: jest.fn().mockResolvedValue(true),
  DocumentDirectoryPath: '/mock/document/path',
  CachesDirectoryPath: '/mock/cache/path',
}));

// Mock react-native-document-picker
jest.mock("react-native-document-picker", () => ({
  pickSingle: jest.fn(),
  isInProgress: jest.fn(),
}));

// Mock react-native-base64 with proper base64 functionality
jest.mock("react-native-base64", () => ({
  decode: jest.fn((str) => {
    try {
      return Buffer.from(str, 'base64').toString('binary');
    } catch {
      return str;
    }
  }),
  encode: jest.fn((str) => {
    try {
      return Buffer.from(str, 'binary').toString('base64');
    } catch {
      return str;
    }
  }),
}));
