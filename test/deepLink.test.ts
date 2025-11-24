import { isDeepLink } from '../app/lib/walletRequestApi'

describe('isDeepLink', () => {
  it('returns true if deep link starts with correct scheme', () => {
    const text =
      'https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=4adfe67b-58b3-45d0-8043-cc3f11f75513&vc_request_url=https://dashboard.dcconsortium.org/api/exchange/d7ff30bd-cc7c-4500-92b8-d17f2de33d32/4adfe67b-58b3-45d0-8043-cc3f11f75513/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ODk2ZjNkNjYyMDNmM2Q5Zjk3YzYyNiIsImlhdCI6MTczNzA2MDE5MSwiZXhwIjoxNzM4MjY5NzkxfQ.f_UnlImw-KJeDuHZXs9vxGNVbo9NQZaDjTXwJhZ12aU'

    const result = isDeepLink(text)
    expect(result).toBe(true)
  })
})
