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

if (typeof globalThis.base64FromArrayBuffer !== 'function') {
  globalThis.base64FromArrayBuffer = function base64FromArrayBuffer(arrayBuffer) {
    var base64    = '';
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var bytes         = new Uint8Array(arrayBuffer);
    var byteLength    = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength    = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63;               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4; // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '==';
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64;
  }

}

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

  const deleteSpace = async () => {
    try {
      setStatus('loading');
      setMessage('Deleting space...');

      if (!connectionDetails) {
        throw new Error('No connection details found');
      }

      // Get the stored signer
      const signerJson = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
      if (!signerJson) {
        throw new Error('No signer found');
      }

      const signer = await Ed25519Signer.fromJSON(signerJson);

      const storage = getStorageClient();

      const space = storage.space({
        signer,
        id: connectionDetails.spaceId as `urn:uuid:${string}`,
      });

      // Delete the space
      const response = await space.delete({
        signer,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete space. Status: ${response.status}`);
      }

      // Clear stored items
      await AsyncStorage.removeItem(WAS_KEYS.SIGNER_JSON);
      await AsyncStorage.removeItem(WAS_KEYS.SPACE_ID);

      setStatus('success');
      setMessage('Space successfully deleted');
      setHasConnection(false);
      setConnectionDetails(null);
    } catch (error) {
      console.error('Error deleting WAS space:', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? `Error: ${error.message}`
          : 'Failed to delete WAS space'
      );
    }
  };

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

    const spaceUrl = `${WAS_BASE_URL}/space/${
      connectionDetails.spaceId.split('urn:uuid:')[1]
    }`;

    return (
      <View
        style={[
          styles.content,
          { backgroundColor: theme.color.backgroundPrimary },
        ]}
      >
        <View style={styles.detailsContainer}>
          <Text style={[styles.label, { color: theme.color.textSecondary }]}>
            Storage Provider
          </Text>
          <Text style={[styles.value, { color: theme.color.textPrimary }]}>
            {WAS_BASE_URL}
          </Text>

          <Text
            style={[
              styles.label,
              styles.labelWithMargin,
              { color: theme.color.textSecondary },
            ]}
          >
            Space URL
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(spaceUrl)}>
            <Text style={[styles.value, { color: theme.color.linkColor }]}>
              {spaceUrl}
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.label,
              styles.labelWithMargin,
              { color: theme.color.textSecondary },
            ]}
          >
            Controller DID
          </Text>
          <Text style={[styles.value, { color: theme.color.textPrimary }]}>
            {connectionDetails.controllerDid}
          </Text>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: theme.color.error },
            ]}
            onPress={deleteSpace}
          >
            <Text
              style={[
                styles.deleteButtonText,
                { color: theme.color.textPrimary },
              ]}
            >
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
        <View
          style={[
            styles.content,
            { backgroundColor: theme.color.backgroundPrimary },
          ]}
        >
          <ActivityIndicator
            size='large'
            color={theme.color.buttonPrimary}
          />
          <Text style={[styles.message, { color: theme.color.textPrimary }]}>
            {message}
          </Text>
        </View>
      );
    case 'success':
      return (
        <View
          style={[
            styles.content,
            { backgroundColor: theme.color.backgroundPrimary },
          ]}
        >
          <Text style={[styles.message, { color: theme.color.success }]}>
            {message}
          </Text>
        </View>
      );
    case 'error':
      return (
        <View
          style={[
            styles.content,
            { backgroundColor: theme.color.backgroundPrimary },
          ]}
        >
          <Text style={[styles.message, { color: theme.color.error }]}>
            {message}
          </Text>
        </View>
      );
    default:
      return (
        <View
          style={[
            styles.content,
            { backgroundColor: theme.color.backgroundPrimary },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.connectButton,
              { backgroundColor: theme.color.buttonPrimary },
            ]}
            onPress={provisionWAS}
          >
            <Text
              style={[
                styles.connectButtonText,
                { color: theme.color.textPrimaryDark },
              ]}
            >
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
      <View
        style={[
          styles.container,
          { backgroundColor: theme.color.backgroundPrimary },
        ]}
      >
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
