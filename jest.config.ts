import type { Config } from 'jest';

const packagesToTransformWithBabel = [
  '@react-native',
  'react-native',
  'expo-secure-store',
  'expo-modules-core',
  'react-native-fs',
  '@digitalcredentials/http-client',
  'realm',
  '@realm', // <-- critical for @realm/fetch
  'react-redux',
  '@reduxjs/toolkit',
  '@testing-library/react-native'
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
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.test.{js,jsx,ts,tsx}',
    '!app/**/*.spec.{js,jsx,ts,tsx}',
  ],
};

export default config;
