import type { Config } from 'jest';

// Add all ESM or untranspiled packages used in your app here
const packagesToTransformWithBabel = [
  '@react-native',
  '@digitalcredentials/http-client',
  'expo-secure-store',
  'expo-modules-core', 
  'react-native-fs',
  'react-native', // core RN package
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
    // Optional: Stub out images/assets in Jest
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'], // needed for mocks
};

export default config;
