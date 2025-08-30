// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);
config.resolver = config.resolver || {};
const prev = config.resolver.resolveRequest;

// helper: resolve a package to a concrete file path, with fallbacks
function resolvePkgFile(pkgName, candidates = []) {
    try {
        return require.resolve(pkgName, { paths: [path.resolve(__dirname)] });
    } catch {
        const base = path.resolve(__dirname, 'node_modules', pkgName);
        for (const rel of candidates) {
            const p = path.join(base, rel);
            if (fs.existsSync(p)) return p;
        }
        return null;
    }
}

// 1) Force CJS entry points for DCC packages (Hermes-friendly)
const FORCE_CJS = {
    '@digitalcredentials/ed25519-signature-2020': ['dist/index.js', 'lib/index.js', 'index.js'],
    '@digitalcredentials/ed25519-verification-key-2020': ['dist/index.js', 'lib/index.js', 'index.js'],
    '@digitalcredentials/data-integrity': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/jsonld-signatures': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/security-document-loader': ['dist/index.cjs', 'lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/eddsa-rdfc-2022-cryptosuite': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/vc': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/vc-status-list': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/vc-bitstring-status-list': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/did-method-key': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/vpqr': ['dist/index.js', 'lib/index.js', 'index.js'],
    '@digitalcredentials/issuer-registry-client': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/ed25519-multikey': ['lib/index.js', 'dist/index.js', 'index.js'],
    '@digitalcredentials/verifier-core': ['dist/index.js', 'lib/index.js', 'index.js', 'dist/Verify.js'], // <-- important
};

// pre-resolve once
const RESOLVED = {};
for (const [name, candidates] of Object.entries(FORCE_CJS)) {
    RESOLVED[name] = resolvePkgFile(name, candidates);
}

config.resolver.resolveRequest = (ctx, moduleName, platform) => {
    // existing shims (you already had these)
    if (moduleName === 'lru-cache' || moduleName.startsWith('lru-cache/')) {
        return { type: 'sourceFile', filePath: path.resolve(__dirname, 'app/shims/lru-cache-compat.js') };
    }
    if (
        moduleName === 'base64url-universal' ||
        moduleName.startsWith('base64url-universal/') ||
        moduleName === '@digitalbazaar/base64url-universal' ||
        moduleName.startsWith('@digitalbazaar/base64url-universal/')
    ) {
        return { type: 'sourceFile', filePath: path.resolve(__dirname, 'app/shims/base64url-universal.js') };
    }

    // 2) Alias legacy name "base58-universal" → @digitalcredentials/base58-universal
    if (moduleName === 'base58-universal') {
        return {
            type: 'sourceFile',
            filePath: resolvePkgFile('@digitalcredentials/base58-universal', ['lib/index.js', 'dist/index.js', 'index.js']),
        };
    }

    // 3) Force DCC modules to concrete CJS files Metro can watch
    if (RESOLVED[moduleName]) {
        return { type: 'sourceFile', filePath: RESOLVED[moduleName] };
    }

    return prev ? prev(ctx, moduleName, platform) : ctx.resolveRequest(ctx, moduleName, platform);
};

// keep your other tweaks
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'cjs'];
config.resolver.assetExts = [...new Set([...(config.resolver.assetExts || []), 'db', 'realm'])];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.enablePackageExports = false;
config.resolver.unstable_enablePackageExports = false;

module.exports = config;