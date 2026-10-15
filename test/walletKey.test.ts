import * as nodeCrypto from 'node:crypto'

import {
  deriveLegacyKeyHex,
  deriveWalletKeyHex,
  LEGACY_KEY_DERIVATIONS,
  legacyPbkdf2Sha1Hex,
  walletKeyFingerprint
} from '../app/lib/walletKey'

// What DatabaseAccess.initialize stores: 64 bytes decoded as UTF-8
// (fixed bytes here; see test/legacyPlaceholderPbkdf2.test.ts).
const APP_SALT =
  '\u0007�5�c��(�V�\u001b�I�w' +
  '\u000e�<�j\u0001�/�]�"�P�~\u0015' +
  '�C�q\b�6�d��)�W�\u001c�J' +
  '�x\u000f�=�k\u0002�0'

const PASSPHRASES = [
  'correct horse battery staple',
  'pässwörd ünïcode \u{1F511}'
]

it('tries SHA-1 before the placeholder', () => {
  expect(LEGACY_KEY_DERIVATIONS).toEqual(['legacy-sha1', 'legacy-placeholder'])
})

// RFC 6070, the PBKDF2-HMAC-SHA1 test vectors, through the function that
// deriveLegacyKeyHex('legacy-sha1') calls
it.each([
  ['password', 'salt', 1, 20, '0c60c80f961f0e71f3a9b524af6012062fe037a6'],
  ['password', 'salt', 2, 20, 'ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957'],
  ['password', 'salt', 4096, 20, '4b007901b765489abead49d926f721d065a429c1'],
  [
    'passwordPASSWORDpassword',
    'saltSALTsaltSALTsaltSALTsaltSALTsalt',
    4096,
    25,
    '3d2eec4fe41c849b80c8d83662c0e44a8b291a964cf2f07038'
  ],
  ['pass\0word', 'sa\0lt', 4096, 16, '56fa6aa75548099dcc37d7f03425e0c3']
])('PBKDF2-HMAC-SHA1(%j, %j, %i, %i)', (password, salt, c, dkLen, hex) => {
  expect(legacyPbkdf2Sha1Hex(password, salt, c, dkLen)).toBe(hex)
})

describe('legacy-sha1 (releases 2.1.0 to 2.2.4)', () => {
  // react-native-quick-crypto 0.7.x used OpenSSL; Node is the reference.
  it.each([
    [
      PASSPHRASES[0],
      'aa463b183f1f8cdf02c91b187e07e868cec46a9d3826974b2cedba459a05b916'
    ],
    [
      PASSPHRASES[1],
      'c31d0d2fe9f04945e5d2fcc3e8ad489b89180436e0f8d5b44f8bea2c9bb13cd3'
    ]
  ])('derives the key for %j as those releases did', (passphrase, hex) => {
    const key = deriveLegacyKeyHex('legacy-sha1', passphrase, APP_SALT)
    expect(key).toBe(hex)
    expect(key).toBe(
      nodeCrypto
        .pbkdf2Sync(passphrase, APP_SALT, 10000, 32, 'sha1')
        .toString('hex')
    )
  })
})

describe('pbkdf2-sha512 (up to 2.0.24, 2.2.5, and new wallets)', () => {
  it.each([
    [
      PASSPHRASES[0],
      '30280903eec21e99f623144c1ee5c1c34df290af76ac5cf4b251f6d9a80d55f6'
    ],
    [
      PASSPHRASES[1],
      'c363e74b47656bcd7feb94da42f4221c414be7f5a902f634c3844629808b5eff'
    ]
  ])('derives the key for %j as 2.2.5 did', (passphrase, hex) => {
    const key = deriveWalletKeyHex(passphrase, APP_SALT)
    expect(key).toBe(hex)
    expect(key).toBe(
      nodeCrypto
        .pbkdf2Sync(passphrase, APP_SALT, 10000, 32, 'sha512')
        .toString('hex')
    )
  })
})

describe('legacy-placeholder (releases 2.2.6 to 2.2.10)', () => {
  it('matches the golden vector', () => {
    expect(
      deriveLegacyKeyHex('legacy-placeholder', PASSPHRASES[1], APP_SALT)
    ).toBe('be5f00a142e38425c66708a94aeb8c2dce6f10b152f39435d67718b95afb9c3d')
  })
})

it('fingerprints a key with SHA-256', () => {
  const key = deriveWalletKeyHex(PASSPHRASES[0], APP_SALT)
  expect(walletKeyFingerprint(key)).toBe(
    nodeCrypto.createHash('sha256').update(key).digest('hex')
  )
})
