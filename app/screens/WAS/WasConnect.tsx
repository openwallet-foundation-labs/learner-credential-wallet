import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { navigationRef } from '../../navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { WAS_KEYS } from '../../../app.config';
import { handleVcApiExchangeComplete } from '../../lib/exchanges';
import { theme } from '../../styles';

export default function WasConnectScreen() {
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  React.useEffect(() => {
    handleScanQR();
  }, []);

  const resetStatus = () => {
    setStatusMessage('');
    setStatusType('');
  };


  const handleScanQR = () => {
    if (navigationRef.isReady()) {
      resetStatus();

      navigationRef.navigate('QRScreen', {
        instructionText: 'Scan QR code from Resume Author to connect your wallet.',
        onReadQRCode: async (qrText: string) => {
          try {
            const requestParam = qrText.split('request=')[1];
            if (!requestParam) {
              throw new Error('Invalid QR code format: missing request parameter');
            }

            const decoded = decodeURIComponent(requestParam);
            const payload = JSON.parse(decoded);
            const requestUrl = payload?.protocols?.vcapi;
            if (!requestUrl) {
              throw new Error('Missing request URL in QR code');
            }

            const signerStr = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
            if (!signerStr) {
              throw new Error('No signer found in storage');
            }

            const key = await Ed25519VerificationKey2020.from(JSON.parse(signerStr));

            await handleVcApiExchangeComplete({
              url: requestUrl,
              holder: key.controller,
              suite: new Ed25519Signature2020({ key })
            });

            setStatusMessage('✅ Wallet successfully connected to Resume Author!');
            setStatusType('success');


            if (navigationRef.isReady()) {
              navigationRef.goBack();
            }
          } catch (error) {
            console.error('❌ Connection failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setStatusMessage(`❌ Failed to connect wallet: ${errorMessage}`);
            setStatusType('error');

            if (navigationRef.isReady()) {
              navigationRef.goBack();
            }
          }
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      {statusMessage !== '' && (
        <Text
          style={[
            styles.statusText,
            statusType === 'success' ? styles.successText : styles.errorText
          ]}
        >
          {statusMessage}
        </Text>
      )}

      {statusType !== '' && (
        <Button title="Reset" onPress={() => {
          resetStatus();
          handleScanQR();
        }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  successText: {
    color: theme.color.success,
  },
  errorText: {
    color: theme.color.error,
  },
});
