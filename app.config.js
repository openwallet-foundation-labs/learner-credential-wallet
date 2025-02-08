/* eslint-disable no-undef */
/**
 * Wallet Configuration File
 */
const env = process.env;
export const VERIFIER_PLUS_URL = env['VERIFIER_PLUS_URL'] || 'https://verifierplus.org';

export const LinkConfig = {
  schemes: {
    customProtocol: ['dccrequest://', 'org.dcconsortium://', 'https://lcw.app/request'],
    universalAppLink: 'https://lcw.app/mobile'
  },
  registerWalletUrl: 'https://lcw.app/register-wallet.html',
  appWebsite: {
    home: 'https://lcw.app',
    // FAQ page assumes #public-link,
    //   #public-link-unshare, and #add-to-linkedin sections
    faq: 'https://lcw.app/faq.html'
  }
};

export default {
  displayName: 'Learner Credential Wallet',

  /**
   * Expo App config
   * @see https://docs.expo.dev/versions/latest/config/app/
   */
  expo: {
    runtimeVersion: '2.1.6',
    version: '2.1.6',
    name: 'Learner Credential Wallet',
    slug: 'learner-credential-wallet',
    orientation: 'portrait',
    icon: './app/assets/icon.png',
    backgroundColor: '#1F2937',
    splash: {
      image: './app/assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1F2937'
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      buildNumber: '86',
      supportsTablet: true,
      bundleIdentifier: 'edu.mit.eduwallet',
      deploymentTarget: '13.0',
      entitlements: {
        'com.apple.security.application-groups': [
          'group.edu.mit.eduwallet'
        ]
      },
      associatedDomains: ['applinks:lcw.app/mobile'],
      infoPlist: {
        'CFBundleURLTypes': [
          {
            'CFBundleURLSchemes': ['dccrequest']
          }
        ]
      }
    },
    android: {
      versionCode: 86,
      adaptiveIcon: {
        foregroundImage: './app/assets/adaptive-icon.png',
        backgroundColor: '#1F2937'
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            {
              scheme: 'dccrequest',
              host: 'request'
            },
            {
              scheme: 'dccrequest',
              host: 'present'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ],
      package: 'app.lcw'
    },
    web: {
      favicon: './app/assets/favicon.png'
    },
    plugins: [
      [
        'react-native-vision-camera',
        {
          cameraPermissionText: '$(PRODUCT_NAME) needs access to your Camera to scan QR codes.',
          enableMicrophonePermission: false,
          enableCodeScanner: true
        }
      ],
      [
        'expo-build-properties',
        {
          android: {
            packagingOptions: {
              pickFirst: ['**/libcrypto.so']
            },
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 29,
            buildToolsVersion: '34.0.0'
          }
        }
      ]
    ]
  }
};

export const KnownDidRegistries = [
  {
    'name': 'DCC Pilot Registry',
    'url': 'https://digitalcredentials.github.io/issuer-registry/registry.json'
  },
  {
    'name': 'DCC Sandbox Registry',
    'url': 'https://digitalcredentials.github.io/sandbox-registry/registry.json'
  },
  {
    'name': 'DCC Community Registry',
    'url': 'https://digitalcredentials.github.io/community-registry/registry.json'
  },
  {
    'name': 'DCC Registry',
    'url': 'https://digitalcredentials.github.io/dcc-registry/registry.json'
  }
];
