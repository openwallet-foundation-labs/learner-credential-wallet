/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';
import {
  Camera,
  useCameraDevices,
  useCodeScanner,
} from 'react-native-vision-camera';

const WASScreen = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  // Ask for camera permissions on mount
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Main payload processing function
  const processPayload = async (payload: any) => {
    const { protocols } = payload;
    const requestUrl = protocols?.vcapi;

    if (!requestUrl) {
      setMessage('❌ Invalid payload: Missing requestUrl');
      return;
    }

    console.log('🔗 Request URL:', requestUrl);
    setMessage('🔄 Requesting credential...');

    try {
      // Step 1: Initiate the credential request
      await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty = request signal
      });

      setMessage('📦 Sending resume credential...');

      // Step 2: Respond with credential
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiablePresentation: {
            verifiableCredential: [payload],
          },
        }),
      });
      console.log('🚀 ~ processPayload ~ response:', response);

      const result = await response.json();
      console.log('✅ Server confirmed:', result);
      setMessage('✅ Resume sent successfully!');
    } catch (err: any) {
      console.error('❌ Failed to send credential:', err);
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  // QR code scan handler
  const onCodeScanned = (codes: any) => {
    if (!scanning || codes.length === 0) return;

    const raw = codes[0].value;
    console.log('📷 QR Raw:', raw);

    try {
      // Expecting URL format like: https://lcw.app/request?request=<payload>
      const requestParam = raw.split('request=')[1];
      const decoded = decodeURIComponent(requestParam);
      const parsed = JSON.parse(decoded);
      console.log('🚀 ~ onCodeScanned ~ parsed:', parsed);

      setScanning(false);
      processPayload(parsed);
    } catch (err: any) {
      console.error('❌ QR Decode Error:', err);
      setMessage('❌ Invalid QR code or payload format.');
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned,
  });

  // No permission yet
  if (!hasPermission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No camera permission</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {scanning ? (
        <>
          {device ? (
            <Camera
              ref={cameraRef}
              style={{ flex: 1 }}
              device={device}
              isActive
              codeScanner={codeScanner}
            />
          ) : (
            <Text>Loading camera...</Text>
          )}
          <Button
            title='Cancel Scan'
            onPress={() => setScanning(false)}
          />
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 10 }}>
            Tap below to scan QR code from Resume Author
          </Text>
          <Button
            title='Start Scan'
            onPress={() => setScanning(true)}
          />
          {message !== '' && <Text style={{ marginTop: 20 }}>{message}</Text>}
        </>
      )}
    </View>
  );
};

export default WASScreen;
