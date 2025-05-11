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
