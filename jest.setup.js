jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
    isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-quick-crypto', () => ({
    getRandomValues: jest.fn((arr) => arr.fill(4)), // dummy entropy
    randomBytes: jest.fn((n) => Buffer.alloc(n, 4)),
    subtle: {
        digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
    Platform: {
        OS: 'android',
        select: jest.fn((obj) => obj.android || obj.default),
    },
    NativeModules: {
        RNSecureRandom: {
            generateSecureRandomAsBase64: jest.fn().mockResolvedValue('mockRandomBase64=='),
        },
    },
    // Add other commonly used RN exports as needed
}));

// Mock react-native-securerandom
jest.mock('react-native-securerandom', () => ({
    generateSecureRandom: jest.fn((length) =>
        Promise.resolve(Buffer.alloc(length, 0x42))
    ),
}));

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
    readFile: jest.fn(),
    exists: jest.fn().mockResolvedValue(true),
    copyFile: jest.fn().mockResolvedValue(undefined),
    TemporaryDirectoryPath: '/tmp',
    DocumentDirectoryPath: '/mock/document/path',
    MainBundlePath: '/mock/bundle/path',
}));

// Mock react-native-document-picker
jest.mock('react-native-document-picker', () => ({
    pickSingle: jest.fn(),
    types: {
        allFiles: '*/*',
        images: 'image/*',
        plainText: 'text/plain',
        pdf: 'application/pdf',
        zip: 'application/zip',
    },
    isInProgress: jest.fn().mockReturnValue(false),
}));