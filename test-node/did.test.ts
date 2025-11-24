import { it, describe } from 'node:test'
import assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { mintDid } from '../app/lib/did'

describe('DID tests', () => {
  describe('mintDid()', () => {
    it('Creates a new DID Document and key pairs', async () => {
      const { didDocument, verificationKey, keyAgreementKey } = await mintDid({
        seed: await randomBytes(32)
      })
      assert.equal(didDocument['@context'][0], 'https://www.w3.org/ns/did/v1')
      assert.ok(didDocument.id.startsWith('did:key'))

      assert.equal(verificationKey.type, 'Ed25519VerificationKey2020')
      assert.ok(verificationKey.privateKeyMultibase)

      assert.equal(keyAgreementKey.type, 'X25519KeyAgreementKey2020')
      assert.ok(keyAgreementKey.privateKeyMultibase)
    })
  })
})
