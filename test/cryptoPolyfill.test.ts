/**
 * Runs the real crypto-polyfill.js, which Metro and Babel alias `crypto` to.
 * jest.setup.js mocks `crypto` for the rest of the suite.
 */
import * as nodeCrypto from 'node:crypto'
// The app's global Buffer (shim.js); Node's Buffer is a different class
import { Buffer as AppBuffer } from '@craftzdog/react-native-buffer'
import { getRandomValues } from 'expo-crypto'
import { createHash, pbkdf2, pbkdf2Sync, randomBytes } from 'crypto'

jest.unmock('crypto')
jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn((array: Uint8Array) =>
    require('node:crypto').getRandomValues(array)
  )
}))

const mockGetRandomValues = getRandomValues as jest.Mock

beforeEach(() => mockGetRandomValues.mockClear())

it('is the real implementation, not the jest.setup.js mock', () => {
  expect(jest.isMockFunction(randomBytes)).toBe(false)
  expect(jest.isMockFunction(pbkdf2Sync)).toBe(false)
  expect(jest.isMockFunction(createHash)).toBe(false)
})

describe('createHash', () => {
  // FIPS 180-2 examples
  it.each([
    [
      'sha256',
      '',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    ],
    [
      'sha256',
      'abc',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    ],
    [
      'sha256',
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    ],
    [
      'sha512',
      'abc',
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a' +
        '2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    ]
  ])('%s(%j)', (algorithm, input, expected) => {
    expect(createHash(algorithm).update(input).digest('hex')).toBe(expected)
  })

  it('returns a Buffer by default and supports base64', () => {
    const digest = createHash('sha256').update('abc').digest()
    expect(AppBuffer.isBuffer(digest)).toBe(true)
    expect(digest.toString('hex')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
    expect(createHash('sha256').update('abc').digest('base64')).toBe(
      nodeCrypto.createHash('sha256').update('abc').digest('base64')
    )
  })

  it('accepts strings, Buffers and Uint8Arrays, across several updates', () => {
    const input = 'héllo wörld \u{1F511} {"a":[1,2,3]}'
    const ours = createHash('sha512')
      .update(input.slice(0, 5))
      .update(Buffer.from(input.slice(5, 12)))
      .update(new Uint8Array(Buffer.from(input.slice(12))))
      .digest('hex')
    expect(ours).toBe(
      nodeCrypto.createHash('sha512').update(input).digest('hex')
    )
  })

  it('accepts the SHA-256 / SHA-512 spellings', () => {
    expect(createHash('SHA-256').update('abc').digest('hex')).toBe(
      createHash('sha256').update('abc').digest('hex')
    )
    expect(createHash('SHA512').update('abc').digest('hex')).toBe(
      createHash('sha512').update('abc').digest('hex')
    )
  })

  it('throws for unsupported algorithms and encodings', () => {
    expect(() => createHash('md5')).toThrow(/unsupported digest algorithm/)
    expect(() => createHash('sha1')).toThrow(/unsupported digest algorithm/)
    expect(() =>
      createHash('sha256')
        .update('abc')
        .digest('latin1' as 'hex')
    ).toThrow(/unsupported digest encoding/)
  })

  it('throws when used after digest', () => {
    const hash = createHash('sha256').update('abc')
    hash.digest('hex')
    expect(() => hash.digest('hex')).toThrow(/digest already called/)
    expect(() => hash.update('more')).toThrow(/digest already called/)
  })
})

describe('pbkdf2Sync', () => {
  // RFC 7914, section 11 (PBKDF2-HMAC-SHA256)
  it.each([
    [
      'passwd',
      'salt',
      1,
      '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc' +
        '49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783'
    ],
    [
      'Password',
      'NaCl',
      80000,
      '4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56' +
        'a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d'
    ]
  ])('PBKDF2-HMAC-SHA256(%j, %j, %i)', (password, salt, c, expected) => {
    expect(pbkdf2Sync(password, salt, c, 64, 'sha256').toString('hex')).toBe(
      expected
    )
  })

  // The RFC 6070 inputs with HMAC-SHA512, as widely published
  it.each([
    [
      'password',
      'salt',
      1,
      '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252' +
        'c02d470a285a0501bad999bfe943c08f050235d7d68b1da55e63f73b60a57fce'
    ],
    [
      'password',
      'salt',
      2,
      'e1d9c16aa681708a45f5c7c4e215ceb66e011a2e9f0040713f18aefdb866d53c' +
        'f76cab2868a39b9f7840edce4fef5a82be67335c77a6068e04112754f27ccf4e'
    ],
    [
      'password',
      'salt',
      4096,
      'd197b1b33db0143e018b12f3d1d1479e6cdebdcc97c5c0f87f6902e072f457b5' +
        '143f30602641b3d55cd335988cb36b84376060ecd532e039b742a239434af2d5'
    ],
    [
      'passwordPASSWORDpassword',
      'saltSALTsaltSALTsaltSALTsaltSALTsalt',
      4096,
      '8c0511f4c6e597c6ac6315d8f0362e225f3c501495ba23b868c005174dc4ee71' +
        '115b59f9e60cd9532fa33e0f75aefe30225c583a186cd82bd4daea9724a3d3b8'
    ]
  ])('PBKDF2-HMAC-SHA512(%j, %j, %i)', (password, salt, c, expected) => {
    expect(pbkdf2Sync(password, salt, c, 64, 'sha512').toString('hex')).toBe(
      expected
    )
  })

  // The wallet's parameters (DatabaseAccess), with the kind of salt it uses:
  // 64 random bytes decoded as UTF-8, so full of U+FFFD and control chars.
  // Release 2.2.5 derived these keys with react-native-quick-crypto (OpenSSL);
  // Node's OpenSSL is the reference here.
  const APP_SALT =
    '\u0007�5�c��(�V�\u001b�I�w' +
    '\u000e�<�j\u0001�/�]�"�P�~\u0015' +
    '�C�q\b�6�d��)�W�\u001c�J' +
    '�x\u000f�=�k\u0002�0'

  it.each([
    [
      'correct horse battery staple',
      '30280903eec21e99f623144c1ee5c1c34df290af76ac5cf4b251f6d9a80d55f6'
    ],
    [
      'pässwörd ünïcode \u{1F511}',
      'c363e74b47656bcd7feb94da42f4221c414be7f5a902f634c3844629808b5eff'
    ]
  ])('derives the wallet key for %j as 2.2.5 did', (passphrase, expected) => {
    const ours = pbkdf2Sync(passphrase, APP_SALT, 10000, 32, 'SHA-512')
    expect(ours.toString('hex')).toBe(expected)
    expect(ours.toString('hex')).toBe(
      nodeCrypto
        .pbkdf2Sync(passphrase, APP_SALT, 10000, 32, 'sha512')
        .toString('hex')
    )
  })

  it('accepts Buffer and Uint8Array inputs', () => {
    expect(
      pbkdf2Sync(
        Buffer.from('password'),
        new Uint8Array(Buffer.from('salt')),
        2,
        32,
        'sha256'
      ).toString('hex')
    ).toBe(
      nodeCrypto.pbkdf2Sync('password', 'salt', 2, 32, 'sha256').toString('hex')
    )
  })

  it('throws for unsupported or missing digests and bad arguments', () => {
    expect(() => pbkdf2Sync('p', 's', 1, 32, 'sha1')).toThrow(
      /unsupported digest algorithm/
    )
    expect(() =>
      // @ts-expect-error digest is required
      pbkdf2Sync('p', 's', 1, 32)
    ).toThrow(/requires a digest/)
    expect(() => pbkdf2Sync('p', 's', 0, 32, 'sha512')).toThrow(/iterations/)
    expect(() => pbkdf2Sync('p', 's', 1, -1, 'sha512')).toThrow(/keylen/)
  })
})

describe('pbkdf2', () => {
  it('calls back with the same key as pbkdf2Sync', async () => {
    const key = await new Promise<Buffer>((resolve, reject) =>
      pbkdf2('password', 'salt', 4096, 64, 'sha512', (err, derived) =>
        err ? reject(err) : resolve(derived)
      )
    )
    expect(key.toString('hex')).toBe(
      pbkdf2Sync('password', 'salt', 4096, 64, 'sha512').toString('hex')
    )
  })
})

describe('randomBytes', () => {
  it('fills a Buffer from expo-crypto getRandomValues', () => {
    const mathRandom = jest.spyOn(Math, 'random')
    const bytes = randomBytes(32)

    expect(mockGetRandomValues).toHaveBeenCalledTimes(1)
    const filled = mockGetRandomValues.mock.calls[0][0] as Uint8Array
    expect(filled).toBeInstanceOf(Uint8Array)
    expect(filled.length).toBe(32)
    expect(AppBuffer.isBuffer(bytes)).toBe(true)
    expect(bytes.length).toBe(32)
    expect([...bytes]).toEqual([...filled])
    expect(mathRandom).not.toHaveBeenCalled()
    mathRandom.mockRestore()
  })

  it('returns a Buffer over its own ArrayBuffer', () => {
    // @noble/ed25519 reads randomBytes(n).buffer directly
    expect(randomBytes(12).buffer.byteLength).toBe(12)
  })

  it('handles zero bytes and rejects bad sizes', () => {
    expect(randomBytes(0).length).toBe(0)
    expect(() => randomBytes(-1)).toThrow(/size/)
    expect(() => randomBytes(1.5)).toThrow(/size/)
  })

  it('supports the callback form', async () => {
    const bytes = await new Promise<Buffer>((resolve, reject) =>
      randomBytes(16, (err, buf) => (err ? reject(err) : resolve(buf)))
    )
    expect(bytes.length).toBe(16)
  })
})
