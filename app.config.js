/* eslint-disable no-undef */
/**
 * Wallet Configuration File
 */
const env = process.env;

const BUILD_NUMBER = parseInt(env.APP_BUILD_NUMBER) || 102;
const VERSION_NUMBER = env.APP_VERSION_NUMBER || "2.2.8";

// Used by the 'Create Public Link' functionality
// If you have forked the LCW and are creating your own wallet app version, 
// please supply your own verifier instance below
export const VERIFIER_INSTANCE_URL =
  env["VERIFIER_INSTANCE_URL"] || "https://verifierplus.org";

export const WAS = {
  enabled: true,
  BASE_URL: "https://storage.dcc.did.coop",
  KEYS: {
    SPACE_ID: "was_space_id",
    SIGNER_KEYPAIR: "was_signer_json",
  },
};
export const ZCAP_EXPIRES = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // 10 days

// Feature Flags section
export const FEATURE_FLAGS = {
  // true - original LCW behavior (require password at setup)
  // false - no password required
  passwordProtect: true,
};

// Display date format for VCs (expiration, date issued, etc)
export const DATE_FORMAT = "MMM D, YYYY";

// Deep Link / Universal App Link configuration
export const LinkConfig = {
  schemes: {
    customProtocol: [
      "dccrequest://",
      "org.dcconsortium://",
      "https://lcw.app/request",
    ],
    universalAppLink: "https://lcw.app/mobile",
  },
  registerWalletUrl: "https://lcw.app/register-wallet.html",
  appWebsite: {
    home: "https://lcw.app",
    faq: "https://lcw.app/faq.html",
  },
};

/**
 * Expo App config
 * @see https://docs.expo.dev/versions/latest/config/app/
 */
export default {
  displayName: "Learner Credential Wallet",
  expo: {
    systemUIAppearance: "automatic",
    runtimeVersion: VERSION_NUMBER,
    version: VERSION_NUMBER,
    name: "Learner Credential Wallet",
    slug: "learner-credential-wallet",
    scheme: "exp+learner-credential-wallet",
    orientation: "portrait",
    icon: "./app/assets/icon.png",
    backgroundColor: "#1F2937",
    splash: {
      image: "./app/assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1F2937",
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      userInterfaceStyle: "automatic",
      buildNumber: BUILD_NUMBER.toString(),
      supportsTablet: true,
      bundleIdentifier: "edu.mit.eduwallet",
      deploymentTarget: "13.0",
      entitlements: {
        "com.apple.security.application-groups": ["group.edu.mit.eduwallet"],
      },
      associatedDomains: ["applinks:lcw.app/mobile"],
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["dccrequest"],
          },
        ],
      },
    },
    android: {
      userInterfaceStyle: "automatic",
      versionCode: BUILD_NUMBER,
      adaptiveIcon: {
        foregroundImage: "./app/assets/adaptive-icon.png",
        backgroundColor: "#1F2937",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: false,
          data: [
            {
              scheme: "dccrequest",
              host: "request",
            },
            {
              scheme: "dccrequest",
              host: "present",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      package: "app.lcw",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
    },
    web: {
      favicon: "./app/assets/favicon.png",
    },
    plugins: [
      [
        "react-native-vision-camera",
        {
          cameraPermissionText:
            "$(PRODUCT_NAME) needs access to your Camera to scan QR codes.",
          enableMicrophonePermission: false,
          enableCodeScanner: true,
        },
      ],
      ["expo-font"],
      ["expo-secure-store"],
      [
        "expo-build-properties",
        {
          ios: {
            newArchEnabled: false,
          },
          android: {
            packagingOptions: {
              pickFirst: ["**/libcrypto.so"],
            },
            newArchEnabled: false,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 29,
            buildToolsVersion: "34.0.0",
          },
        },
      ],
    ],
  },
};

export const KnownDidRegistries = [
  {
    name: "DCC Pilot Registry",
    url: "https://digitalcredentials.github.io/issuer-registry/registry.json",
  },
  {
    name: "DCC Sandbox Registry",
    url: "https://digitalcredentials.github.io/sandbox-registry/registry.json",
  },
  {
    name: "DCC Community Registry",
    url: "https://digitalcredentials.github.io/community-registry/registry.json",
  },
  {
    name: "DCC Registry",
    url: "https://digitalcredentials.github.io/dcc-registry/registry.json",
  },
];

export const CANCEL_PICKER_MESSAGES = [
  "user canceled the document picker",
  "User canceled document picker",
];
