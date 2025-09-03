import {useCallback, useEffect, useState} from 'react';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Platform} from 'react-native';

export type PermissionResponse = {
  status: 'undetermined' | 'granted' | 'denied';
  requestPermission: () => any;
};

export function useCameraPermissionStatus(): PermissionResponse {
  const [status, setStatus] =
    useState<PermissionResponse['status']>('undetermined');

  const cameraPermission = Platform.OS === 'ios' 
    ? PERMISSIONS.IOS.CAMERA 
    : PERMISSIONS.ANDROID.CAMERA;

  const requestPermission = useCallback(async () => {
    const result = await request(cameraPermission);
    switch (result) {
      case RESULTS.GRANTED:
        setStatus('granted');
        break;
      case RESULTS.DENIED:
      case RESULTS.BLOCKED:
      case RESULTS.LIMITED:
        setStatus('denied');
        break;
      default:
        setStatus('undetermined');
    }
  }, [cameraPermission]);

  useEffect(() => {
    const checkPermissions = async () => {
      const result = await check(cameraPermission);
      switch (result) {
        case RESULTS.GRANTED:
          setStatus('granted');
          break;
        case RESULTS.DENIED:
        case RESULTS.BLOCKED:
        case RESULTS.LIMITED:
          setStatus('denied');
          break;
        case RESULTS.UNAVAILABLE:
        default:
          setStatus('undetermined');
      }
    };
    checkPermissions();
  }, [cameraPermission]);

  return {
    status,
    requestPermission,
  };
}
