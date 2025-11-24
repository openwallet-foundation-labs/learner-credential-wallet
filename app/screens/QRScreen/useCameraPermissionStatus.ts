import { useCallback, useEffect, useState } from 'react'
import { Camera } from 'react-native-vision-camera'

export type PermissionResponse = {
  status: 'undetermined' | 'granted' | 'denied'
  requestPermission: () => any
}

export function useCameraPermissionStatus(): PermissionResponse {
  const [status, setStatus] =
    useState<PermissionResponse['status']>('undetermined')

  const requestPermission = useCallback(async () => {
    const result = await Camera.requestCameraPermission()
    setStatus(result)
  }, [])

  useEffect(() => {
    const s = Camera.getCameraPermissionStatus()
    if (s === 'granted' || s === 'denied') {
      setStatus(s)
    }
  }, [])

  return {
    status,
    requestPermission
  }
}
