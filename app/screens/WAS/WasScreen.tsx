/* eslint-disable react-native/no-color-literals */
if (typeof btoa === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.btoa = (str: any) => Buffer.from(str, 'binary').toString('base64');
}
import 'react-native-get-random-values';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavHeader } from '../../components';
import { navigationRef } from '../../navigation';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';
import { StorageClient } from '@wallet.storage/fetch-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { WAS_BASE_URL } from '../../../app.config';

export const WAS_KEYS = {
  SPACE_ID: 'was_space_id',
  SIGNER_JSON: 'was_signer_json'
};

// Create a singleton instance of StorageClient
let storageClientInstance: InstanceType<typeof StorageClient> | null = null;

export function getStorageClient() {
  if (!storageClientInstance) {
    storageClientInstance = new StorageClient(new URL(WAS_BASE_URL));
  }
  return storageClientInstance;
}

const WASScreen = () => {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState<string>('');

  const provisionWAS = async () => {
    try {
      setStatus('loading');
      setMessage('Generating signer...');

      // Generate a new Ed25519 signer (key pair)
      const appDidSigner = await Ed25519Signer.generate();
      console.log('Generated signer:', appDidSigner.id);

      // Extract base controller DID (without the key fragment)
      const baseDidController = appDidSigner.id.split('#')[0];
      console.log('Controller DID:', baseDidController);

      setMessage('Creating space...');

      // Generate a UUID for the space
      const spaceUUID = uuidv4();
      const spaceId = `urn:uuid:${spaceUUID}`;
      console.log('Space ID:', spaceId);

      // Use the singleton storage client
      const storage = getStorageClient();
      
      const space = storage.space({ 
        signer: appDidSigner,
        id: spaceId as `urn:uuid:${string}`
      });

      const spaceObject = {
        id: spaceId
      };
      
      console.log('Creating space with object:', spaceObject);
      
      const spaceObjectBlob = new Blob(
        [JSON.stringify(spaceObject)],
        { type: 'application/json' }
      );

      // Create the space
      const response = await space.put(spaceObjectBlob, {
        signer: appDidSigner
      });
      
      console.log('Space PUT response:', {
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initialize space. Status: ${response.status}`);
      }
      
      // Store the signer for future connections
      const signerJson = await appDidSigner.toJSON();
      await AsyncStorage.setItem(
        WAS_KEYS.SIGNER_JSON,
        JSON.stringify(signerJson)
      );
      
      // Store the space UUID for future connections
      await AsyncStorage.setItem(WAS_KEYS.SPACE_ID, spaceUUID);
      console.log('Stored space ID in AsyncStorage:', spaceUUID);

      setStatus('success');
      setMessage('WAS storage successfully provisioned!');
    } catch (error) {
      console.error('Error in wallet storage provisioning:', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? `Error: ${error.message}`
          : 'Failed to provision WAS storage'
      );

      // Clear stored items if provisioning failed
      await AsyncStorage.removeItem(WAS_KEYS.SIGNER_JSON);
      await AsyncStorage.removeItem(WAS_KEYS.SPACE_ID);
    }
  };

  useEffect(() => {
    provisionWAS();
  }, []);

  const renderContent = () => {
    switch (status) {
    case 'loading':
      return (
        <View style={styles.content}>
          <ActivityIndicator
            size='large'
            color='#0000ff'
          />
          <Text style={styles.message}>{message}</Text>
        </View>
      );
    case 'success':
      return (
        <View style={styles.content}>
          <Text style={[styles.message, styles.successMessage]}>
            {message}
          </Text>
        </View>
      );
    case 'error':
      return (
        <View style={styles.content}>
          <Text style={[styles.message, styles.errorMessage]}>{message}</Text>
        </View>
      );
    default:
      return null;
    }
  };

  return (
    <>
      <NavHeader
        title='W.A.S'
        goBack={navigationRef.goBack}
      />
      <View style={styles.container}>{renderContent()}</View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  successMessage: {
    color: '#4CAF50', // Material Design Green
  },
  errorMessage: {
    color: '#F44336', // Material Design Red
  },
});

export default WASScreen;
