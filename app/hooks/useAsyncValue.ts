import { useEffect, useState } from 'react'

type Payload = {
  loading: boolean
  error: Error | undefined
}

export function useAsyncValue<T>(
  func: () => Promise<T>,
  initialValue?: T
): [T | undefined, Payload] {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState()
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    await func().then(setValue).catch(setError)
    setLoading(false)
  }

  useEffect(() => {
    run()
  }, [])

  return [value, { loading, error }]
}
