// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for Realm and other native modules
config.resolver.sourceExts.push('cjs');
config.resolver.assetExts.push('db');

// Ensure proper handling of native modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Handle ES modules properly
config.resolver.enablePackageExports = true;
config.resolver.unstable_enablePackageExports = true;

// Add support for Realm binary files
config.resolver.assetExts.push('realm');

module.exports = config;