import 'react-native-get-random-values';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, Linking, ScrollView, Alert } from 'react-native';
import {
  Camera,
  useCameraDevices,
  useCodeScanner,
} from 'react-native-vision-camera';
import { NavHeader } from '../../components';
import { navigationRef } from '../../navigation';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';
import { WalletStorage } from '@did.coop/wallet-attached-storage';
import { styles } from '../../styles/WasScreen';

// For QR code scanning
if (typeof btoa === 'undefined') {
  globalThis.btoa = (str: any) => Buffer.from(str, 'binary').toString('base64');
}

const WASScreen = () => {
  const cameraRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [resumeData, setResumeData] = useState();
  const [storedSuccessfully, setStoredSuccessfully] = useState(false);
  const [error, setError] = useState('');
  const [rawQRData, setRawQRData] = useState('');
  const devices = useCameraDevices();
  const device = devices.find(device => device.position === 'back');

  const onCodeScanned = (codes: any) => {
    if (codes.length > 0 && scanning) {
      const qrData = codes[0].value;
      setRawQRData(qrData);
      console.log('Raw QR Data:', qrData);

      try {
        let payload = null;

        if (qrData.startsWith('walletapp://import?payload=')) {
          const payloadParam = qrData.split('payload=')[1];
          const decodedPayload = decodeURIComponent(payloadParam);
          console.log('Decoded Payload:', decodedPayload);

          try {
            payload = JSON.parse(decodedPayload);
          } catch (parseError: any) {
            console.error('JSON parse error:', parseError);
            setError(
              `Failed to parse payload JSON: ${
                parseError.message
              }. Raw payload: ${decodedPayload.substring(0, 50)}...`
            );
            return;
          }
        } else {
          // Try to handle potential URL encoding or other formats
          let dataToProcess = qrData;

          // Check if it might be URL encoded
          if (qrData.includes('%')) {
            try {
              dataToProcess = decodeURIComponent(qrData);
              console.log('URL Decoded:', dataToProcess);
            } catch (decodeErr) {
              console.log('Not URL encoded, proceeding with raw data');
            }
          }

          try {
            payload = JSON.parse(dataToProcess);
          } catch (parseError: any) {
            console.error('JSON parse error for direct data:', parseError);

            // If we can't parse as JSON, try to treat it as a plain resume ID string
            if (
              typeof dataToProcess === 'string' &&
              dataToProcess.trim() !== ''
            ) {
              payload = { resumeId: dataToProcess.trim() };
              console.log('Created simple payload with resumeId:', payload);
            } else {
              setError(
                `Failed to parse QR code data: ${
                  parseError.message
                }. Raw data: ${dataToProcess.substring(0, 50)}...`
              );
              return;
            }
          }
        }

        if (payload) {
          setScanning(false);
          processResumeData(payload);
        } else {
          setError('No valid payload found in QR code');
        }
      } catch (error: any) {
        console.error('Error processing QR code:', error);
        setError(
          `Failed to process QR code: ${
            error.message
          }. Raw data: ${qrData.substring(0, 50)}...`
        );
      }
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onCodeScanned,
  });

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      if (status !== 'granted') {
        console.error('Camera permission not granted');
      }
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    return () => linkingSubscription.remove();
  }, []);

  const handleDeepLink = ({ url }: { url: string }) => {
    if (url && url.startsWith('walletapp://import')) {
      try {
        const payloadParam = url.split('payload=')[1];
        if (payloadParam) {
          const decodedPayload = decodeURIComponent(payloadParam);
          const payload = JSON.parse(decodedPayload);
          processResumeData(payload);
        }
      } catch (error: any) {
        console.error('Error processing deep link:', error);
        setError('Failed to process the link: ' + error.message);
      }
    }
  };

  const processResumeData = async (payload: any) => {
    try {
      setResumeData(payload);
      const result = await storeResumeInWAS(payload);

      if (result.success) {
        setStoredSuccessfully(true);
      } else {
        setError(result.error);
      }
    } catch (error: any) {
      console.error('Error storing resume:', error);
      setError('Failed to store resume: ' + error.message);
    }
  };

  const storeResumeInWAS = async (payload: any) => {
    try {
      const appDidSigner = await Ed25519Signer.generate();
      const baseDidController = appDidSigner.id.split('#')[0];

      const space = await WalletStorage.provisionSpace({
        url: 'https://data.pub',
        signer: appDidSigner,
      });

      const spaceObject = {
        controller: baseDidController,
        type: 'Collection',
        items: [],
        totalItems: 0,
      };
      const spaceObjectBlob = new Blob([JSON.stringify(spaceObject)], {
        type: 'application/json',
      });

      await space.put(spaceObjectBlob);

      const resourceName = `resume-${payload.resumeId || Date.now()}`;
      const resumeBlob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      const resource = space.resource(resourceName);
      await resource.put(resumeBlob);

      console.log('Resume stored successfully in WAS:', resourceName);

      // Retrieve the resource to verify
      console.log('About to GET resource from path:', resource.path);
      const response = await resource.get({
        signer: appDidSigner,
      });

      console.log('Resource GET Status code:', response.status);

      if (response.ok) {
        try {
          if (response.blob) {
            const blob = await response.blob();
            const text = await new Response(blob).text();
            console.log('Retrieved content from resource:', text);
          } else {
            console.error('response.blob is undefined');
          }
        } catch (error) {
          console.error('Error reading content:', error);
        }
      }
      return { success: true, resourceName };
    } catch (error: any) {
      console.error('Error in WAS storage:', error);
      return { success: false, error: error.message };
    }
  };

  const showRawQRData = () => {
    if (rawQRData) {
      Alert.alert('Raw QR Data', rawQRData, [{ text: 'OK' }]);
    }
  };

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <>
      <NavHeader
        title='Wallet Storage'
        goBack={navigationRef.goBack}
      />
      <View style={styles.container}>
        {scanning ? (
          <View style={styles.cameraContainer}>
            {device ? (
              <Camera
                ref={cameraRef}
                style={styles.scanner}
                device={device}
                isActive={true}
                codeScanner={codeScanner}
                onInitialized={() => console.log('📸 Camera ready')}
                onError={error => {
                  console.error('Camera error:', error);
                  setError(error.message);
                }}
              />
            ) : (
              <Text>Loading camera...</Text>
            )}
            <Button
              title='Cancel Scan'
              onPress={() => setScanning(false)}
            />
          </View>
        ) : (
          <View style={styles.content}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
                {rawQRData ? (
                  <Button
                    title='Show Raw QR Data'
                    onPress={showRawQRData}
                  />
                ) : null}
                <Button
                  title='Try Again'
                  onPress={() => {
                    setError('');
                    setRawQRData('');
                    setScanning(true);
                  }}
                />
              </View>
            ) : resumeData ? (
              <ScrollView style={styles.dataContainer}>
                <Text style={styles.successText}>
                  {storedSuccessfully
                    ? '✅ Resume successfully stored in your wallet!'
                    : 'Processing resume...'}
                </Text>

                <Text style={styles.dataTitle}>Resume Information:</Text>

                {Object.entries(resumeData).map(([key, value]) => (
                  <Text
                    key={key}
                    style={styles.dataItem}
                  >
                    <Text style={styles.dataKey}>{key}:</Text>{' '}
                    {typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)}
                  </Text>
                ))}

                <Button
                  title='Scan Another Resume'
                  onPress={() => {
                    setResumeData(undefined);
                    setStoredSuccessfully(false);
                    setRawQRData('');
                    setScanning(true);
                  }}
                />
              </ScrollView>
            ) : (
              <>
                <Text style={styles.welcomeText}>
                  Scan a QR code to import a resume
                </Text>
                <Button
                  title='Scan QR Code'
                  onPress={() => setScanning(true)}
                />
              </>
            )}
          </View>
        )}
      </View>
    </>
  );
};

export default WASScreen;
