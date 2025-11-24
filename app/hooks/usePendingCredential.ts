import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import {
  PendingCredential,
  selectPendingCredentials
} from '../store/slices/credentialFoyer'

export function usePendingCredential(
  pendingCredentialId: string
): PendingCredential {
  const pendingCredentials = useSelector(selectPendingCredentials)

  const pendingCredential = useMemo(
    () => pendingCredentials.find(({ id }) => id === pendingCredentialId),
    [pendingCredentials, pendingCredentialId]
  )

  if (pendingCredential === undefined) {
    throw new Error(
      `Pending credential with id ${pendingCredentialId} does not exist.`
    )
  }

  return pendingCredential
}
