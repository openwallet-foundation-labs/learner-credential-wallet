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
import { removeWasPublicLink } from '../../lib/removeWasPublicLink';
import { shareData } from '../../lib/shareData';
import { displayGlobalModal } from '../../lib/globalModal';
import { createHttpSignatureAuthorization } from 'authorization-signature';

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

      const mapData = await AsyncStorage.getItem('map');
      if (mapData) {
        const map = JSON.parse(mapData);
        // Get all keys that start with 'publiclinks_'
        const publicLinkKeys = Object.keys(map)
          .filter(key => key.startsWith('publiclinks_'))
          .map(key => key.replace('publiclinks_', ''));

        // Process each public link
        for (const key of publicLinkKeys) {
          await removeWasPublicLink(key, map);
        }
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
        id: spaceId,
        controller: baseDidController
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

  const exportSpace = async () => {
    try {
      setStatus('loading');
      setMessage('Exporting space...');
  
      if (!connectionDetails) {
        throw new Error('No connection details found');
      }
  
      // Show confirmation modal
      const confirmed = await displayGlobalModal({
        title: 'Export Space',
        confirmText: 'Export',
        cancelOnBackgroundPress: true,
        body: (
          <Text style={{ color: theme.color.textPrimary }}>
            This will export your entire WAS space as a tarball file.
          </Text>
        )
      });
  
      if (!confirmed) {
        setStatus('idle');
        setMessage('');
        return;
      }
  
      // Get the stored signer
      const signerJson = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
      if (!signerJson) {
        throw new Error('No signer found');
      }

      const signer = await Ed25519Signer.fromJSON(signerJson);
  
      // Extract space UUID from the URN format
      const spaceUuid = connectionDetails.spaceId.replace('urn:uuid:', '');
      const exportUrl = `${WAS_BASE_URL}/space/${spaceUuid}`;
      
      console.log('Fetching space export from:', exportUrl);
  
      // Add HTTP signature authorization
      const authorization = await createHttpSignatureAuthorization({
        signer,
        url: new URL(exportUrl),
        method: 'GET',
        headers: {},
        includeHeaders: [
          '(created)',
          '(expires)',
          '(key-id)',
          '(request-target)'
        ],
        created: new Date(),
        expires: new Date(Date.now() + 30 * 1000),
      });

      // Create the authorized request
      const authorizedRequest = new Request(exportUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/x-tar, application/octet-stream, */*',
          'Authorization': authorization,
        }
      });
  
      console.log('Export request headers:', authorizedRequest.headers);
  
      const response = await fetch(authorizedRequest);
  
      console.log('Export response status:', response.status);
      console.log('Export response headers:', response.headers);
  
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to export space. Status: ${response.status}, Error: ${errorText}`);
      }
  
      // Check if we actually got binary data
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
  
      let arrayBuffer;
      try {
        // Use arrayBuffer() instead of blob() for better React Native compatibility
        arrayBuffer = await response.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Received empty file from server');
        }
      } catch (bufferError) {
        console.error('Error getting arrayBuffer:', bufferError);
        throw new Error('Failed to process downloaded data');
      }
      
      // Convert array buffer to base64 using the global function
      let base64;
      try {
        if (typeof globalThis.base64FromArrayBuffer === 'function') {
          base64 = globalThis.base64FromArrayBuffer(arrayBuffer);
        } else {
          // Fallback base64 conversion
          const uint8Array = new Uint8Array(arrayBuffer);
          const binaryString = Array.from(uint8Array)
            .map(byte => String.fromCharCode(byte))
            .join('');
          base64 = btoa(binaryString);
        }
        
        if (!base64 || base64.length === 0) {
          throw new Error('Failed to convert data to base64');
        }
        
        console.log('Base64 conversion successful, length:', base64.length);
      } catch (base64Error) {
        console.error('Error converting to base64:', base64Error);
        throw new Error('Failed to encode file data');
      }
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]; // Remove milliseconds
      const fileName = `was-space-${timestamp}.tar`;
      
      console.log('Sharing file:', fileName);
      
      // Use shareData utility to handle the file sharing
      try {
        await shareData(fileName, base64, 'application/x-tar');
        console.log('Share completed successfully');
      } catch (shareError) {
        console.error('Error sharing file:', shareError);
        // Try alternative mime types if the first one fails
        try {
          await shareData(fileName, base64, 'application/octet-stream');
        } catch (fallbackError) {
          throw new Error(`Failed to share file: ${(shareError as Error).message}`);
        }
      }
  
      setStatus('success');
      setMessage('Space exported successfully! Check your device\'s sharing options.');
  
    } catch (error) {
      console.error('Error exporting space:', error);
      setStatus('error');
      
      // Provide more specific error messages
      let errorMessage = 'Failed to export space';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error: Please check your internet connection';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please try again later.';
        } else if (error.message.includes('Status: 404')) {
          errorMessage = 'Space not found on server. It may have been deleted.';
        } else if (error.message.includes('Status: 403')) {
          errorMessage = 'Access denied. Please check your credentials.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setMessage(errorMessage);
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
          <TouchableOpacity
            style={[
              styles.connectButton,
              { backgroundColor: theme.color.buttonPrimary },
            ]}
            onPress={exportSpace}
          >
            <Text
              style={[
                styles.connectButtonText,
                { color: theme.color.textPrimary },
              ]}
            >
              Export Space
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
