import type { Config } from 'jest';

const packagesToTransformWithBabel = [
  '@react-native',
  'react-native',
  'expo-secure-store',
  'expo-modules-core',
  'expo-font',
  'react-native-fs',
  'base58-universal',
  'base64url-universal',
  '@interop/*',
  '@digitalcredentials/*',
  'realm',
  '@realm', // <-- critical for @realm/fetch
  'react-redux',
  '@reduxjs/toolkit',
  '@testing-library/react-native',
  '@expo/vector-icons',
  'immer',
  'react-native-securerandom',
  'rn-animated-ellipsis',
  'react-native-outside-press'
];

const transformIgnorePatterns = [
  `/node_modules/(?!(${packagesToTransformWithBabel.join('|')}))`,
];

const config: Config = {
  preset: 'react-native',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns,
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Coverage disabled for default test runs - use jest.config.coverage.ts for coverage
};

export default config;
