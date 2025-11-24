import { useSelector } from 'react-redux'

import { CredentialRecordRaw } from '../model'
import { selectSelectedExchangeCredentials } from '../store/slices/credentialFoyer'

export function useSelectedExchangeCredentials(): CredentialRecordRaw[] {
  return useSelector(selectSelectedExchangeCredentials)
}
