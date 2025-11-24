import { useCallback, useContext, useState } from 'react'
import { CredentialError } from '../types/credential'
import { CredentialRecordRaw } from '../model'
import { useFocusEffect } from '@react-navigation/native'
import { DidRegistryContext } from '../init/registries'
import { VerifyPayload, verificationResultFor } from '../lib/verifiableObject'

const DEFAULT_ERROR_MESSAGE =
  'An error was encountered while verifying this credential.'

const initialResult = { timestamp: null, log: [], verified: null }

// Adapted from https://usehooks.com/useAsync/
export function useVerifyCredential(
  rawCredentialRecord?: CredentialRecordRaw,
  forceFresh = false
): VerifyPayload | null {
  const [loading, setLoading] = useState<VerifyPayload['loading']>(true)
  const [result, setResult] = useState<VerifyPayload['result']>(initialResult)
  const [error, setError] = useState<VerifyPayload['error']>(null)

  const registries = useContext(DidRegistryContext)

  if (rawCredentialRecord === undefined) {
    return null
  }

  const verify = useCallback(async () => {
    const verificationResult = await verificationResultFor({
      rawCredentialRecord,
      forceFresh,
      registries
    })
    setResult(verificationResult)

    if (verificationResult.error) {
      const { message } = verificationResult.error
      const credentialErrors = Object.values(CredentialError) as string[]
      const errorMessage = credentialErrors.includes(message)
        ? message
        : DEFAULT_ERROR_MESSAGE

      setError(errorMessage)
    }

    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      verify()
    }, [verify])
  )

  return { loading, error, result }
}
