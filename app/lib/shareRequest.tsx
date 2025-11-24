import { CredentialRecordRaw, ProfileRecordRaw } from '../model'
import { selectWithFactory } from '../store/selectorFactories'
import { makeSelectDidFromProfile } from '../store/selectorFactories/makeSelectDidFromProfile'
import { createVerifiablePresentation } from './present'

export type ShareRequestParams = {
  client_id: string
  nonce: string
  redirect_uri: string
}

export function isShareRequestParams(
  params?: Record<string, unknown>
): params is ShareRequestParams {
  params = params || ({} as ShareRequestParams)
  return 'client_id' in params && 'nonce' in params && 'redirect_uri' in params
}

export async function performShareRequest(
  params: ShareRequestParams,
  rawCredentialRecords: CredentialRecordRaw[],
  rawProfileRecord: ProfileRecordRaw
): Promise<void> {
  const { redirect_uri, nonce } = params
  console.debug('Share request params', JSON.stringify(params, null, 2))

  const credentials = rawCredentialRecords.map(({ credential }) => credential)
  const rawDidRecord = selectWithFactory(makeSelectDidFromProfile, {
    rawProfileRecord
  })
  const vp = await createVerifiablePresentation({
    didRecord: rawDidRecord,
    verifiableCredential: credentials,
    challenge: nonce
  })

  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(vp)
  }

  const response = await fetch(redirect_uri, request)
  console.debug('Share request response: ', JSON.stringify(response, null, 2))

  if (!response.ok) {
    throw new Error('Share request failed')
  }
}
