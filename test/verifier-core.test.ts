import { verifyPresentation } from '../app/lib/validate';

import { mockCredential } from '../app/mock/credential';
import { IVerifiablePresentation } from '@digitalcredentials/ssi';

describe('verifier-core usage', () => {
  it('should verify a VP', async () => {
    const mockVp: IVerifiablePresentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: 'VerifiablePresentation',
      verifiableCredential: [ mockCredential ]
    }
    const result = await verifyPresentation(mockVp);
    console.log(result);
  })
})
