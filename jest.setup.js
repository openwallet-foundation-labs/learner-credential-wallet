jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("react-native-quick-crypto", () => ({
  getRandomValues: jest.fn((arr) => arr.fill(4)), // dummy entropy
  randomBytes: jest.fn((n) => Buffer.alloc(n, 4)),
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
  },
}));

// Mock Platform for tests that access Platform.OS directly
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: "ios",
  select: (objs) => objs.ios,
}));

// Ensure global Platform is available
global.Platform = { OS: "ios", select: (o) => o.ios };
