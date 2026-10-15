import { legacyPlaceholderPbkdf2 } from '../app/lib/legacyPlaceholderPbkdf2'

/**
 * Golden vectors, computed by running the original crypto-polyfill.js
 * (`git show 1c46a82:crypto-polyfill.js`) `pbkdf2Sync`. Wallets set up on
 * 2.2.6 to 2.2.10 can only be opened if these stay exactly as they are.
 *
 * APP_SALT is what DatabaseAccess.initialize stores: 64 bytes decoded as UTF-8
 * with text-encoding's TextDecoder. These bytes are fixed, not random.
 */
const APP_SALT =
  '\u0007�5�c��(�V�\u001b�I�w' +
  '\u000e�<�j\u0001�/�]�"�P�~\u0015' +
  '�C�q\b�6�d��)�W�\u001c�J' +
  '�x\u000f�=�k\u0002�0'

const GOLDEN: [string, string, number, number, string][] = [
  [
    'correct horse battery staple',
    APP_SALT,
    10000,
    32,
    '8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'
  ],
  [
    'pässwörd ünïcode 🔑',
    APP_SALT,
    10000,
    32,
    'be5f00a142e38425c66708a94aeb8c2dce6f10b152f39435d67718b95afb9c3d'
  ],
  [
    'a',
    'salt',
    10000,
    32,
    'b97939f9b97939f9b97939f9b97939f9b97939f9b97939f9b97939f9b97939f9'
  ],
  [
    'Passphrase123!',
    '��Aé中�',
    10000,
    32,
    '3fa00162c32485e647a8096acb2c8dee4fb01172d33495f657b8197adb3c9dfe'
  ],
  ['password', 'salt', 1, 20, '1e3f6081a2c3e40526476889aacbec0d2e4f7091']
]

it('matches the salt DatabaseAccess.initialize produces', () => {
  const { TextDecoder } = require('text-encoding')
  const raw = Uint8Array.from({ length: 64 }, (_, i) => (i * 151 + 7) & 0xff)
  expect(new TextDecoder().decode(raw)).toBe(APP_SALT)
})

it.each(GOLDEN)(
  'reproduces 2.2.6-2.2.10 output for (%j, salt, %i, %i)',
  (password, salt, iterations, keylen, hex) => {
    const out = legacyPlaceholderPbkdf2(password, salt, iterations, keylen)
    expect(out).toBeInstanceOf(Uint8Array)
    expect(Buffer.from(out).toString('hex')).toBe(hex)
  }
)
