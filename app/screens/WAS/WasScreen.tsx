/* eslint-disable react-native/no-color-literals */
if (typeof btoa === 'undefined') {
  // eslint-disable-next-line no-global-assign
  globalThis.btoa = (str: any) => Buffer.from(str, 'binary').toString('base64');
}
import 'react-native-get-random-values';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { NavHeader } from '../../components';
import { navigationRef } from '../../navigation';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';
import { StorageClient } from '@wallet.storage/fetch-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { WAS_BASE_URL } from '../../../app.config';
import { useThemeContext } from '../../hooks';

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
  const { theme } = useThemeContext();
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState<string>('');
  const [hasConnection, setHasConnection] = useState<boolean>(false);
  const [connectionDetails, setConnectionDetails] = useState<{
    spaceId: string;
    controllerDid: string;
  } | null>(null);

  const checkExistingConnection = async () => {
    try {
      const spaceId = await AsyncStorage.getItem(WAS_KEYS.SPACE_ID);
      const signerJson = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
      
      if (spaceId && signerJson) {
        setHasConnection(true);
        const signer = await Ed25519Signer.fromJSON(signerJson);
        setConnectionDetails({
          spaceId: `urn:uuid:${spaceId}`,
          controllerDid: signer.id
        });
      }
    } catch (error) {
      console.error('Error checking WAS connection:', error);
    }
  };

  useEffect(() => {
    checkExistingConnection();
  }, []);

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
      setHasConnection(true);
      setConnectionDetails({
        spaceId,
        controllerDid: appDidSigner.id
      });
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

  const renderConnectionDetails = () => {
    if (!connectionDetails) return null;

    const spaceUrl = `${WAS_BASE_URL}/space/${connectionDetails.spaceId.split('urn:uuid:')[1]}/`;

    return (
      <View style={[styles.content, { backgroundColor: theme.color.backgroundPrimary }]}>
        <View style={styles.detailsContainer}>
          <Text style={[styles.label, { color: theme.color.textSecondary }]}>Storage Provider</Text>
          <Text style={[styles.value, { color: theme.color.textPrimary }]}>{WAS_BASE_URL}</Text>

          <Text style={[styles.label, styles.labelWithMargin, { color: theme.color.textSecondary }]}>Space URL</Text>
          <TouchableOpacity onPress={() => Linking.openURL(spaceUrl)}>
            <Text style={[styles.value, { color: theme.color.linkColor }]}>{spaceUrl}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, styles.labelWithMargin, { color: theme.color.textSecondary }]}>Controller DID</Text>
          <Text style={[styles.value, { color: theme.color.textPrimary }]}>{connectionDetails.controllerDid}</Text>

          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: theme.color.buttonDisabled }]}
            disabled={true}
          >
            <Text style={[styles.deleteButtonText, { color: theme.color.textPrimary }]}>
              Delete/Unprovision Space
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (hasConnection) {
      return renderConnectionDetails();
    }

    switch (status) {
    case 'loading':
      return (
        <View style={[styles.content, { backgroundColor: theme.color.backgroundPrimary }]}>
          <ActivityIndicator
            size='large'
            color={theme.color.buttonPrimary}
          />
          <Text style={[styles.message, { color: theme.color.textPrimary }]}>{message}</Text>
        </View>
      );
    case 'success':
      return (
        <View style={[styles.content, { backgroundColor: theme.color.backgroundPrimary }]}>
          <Text style={[styles.message, { color: theme.color.success }]}>
            {message}
          </Text>
        </View>
      );
    case 'error':
      return (
        <View style={[styles.content, { backgroundColor: theme.color.backgroundPrimary }]}>
          <Text style={[styles.message, { color: theme.color.error }]}>{message}</Text>
        </View>
      );
    default:
      return (
        <View style={[styles.content, { backgroundColor: theme.color.backgroundPrimary }]}>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: theme.color.buttonPrimary }]}
            onPress={provisionWAS}
          >
            <Text style={[styles.connectButtonText, { color: theme.color.textPrimaryDark }]}>
              Connect to W.A.S.
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <>
      <NavHeader
        title={hasConnection ? 'W.A.S. Connection' : 'W.A.S'}
        goBack={navigationRef.goBack}
      />
      <View style={[styles.container, { backgroundColor: theme.color.backgroundPrimary }]}>
        {renderContent()}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  connectButton: {
    padding: 16,
    borderRadius: 5,
    minWidth: 200,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  detailsContainer: {
    width: '100%',
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginBottom: 4,
  },
  labelWithMargin: {
    marginTop: 16,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  deleteButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
});

export default WASScreen;
