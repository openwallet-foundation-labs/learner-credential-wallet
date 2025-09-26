import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import NavHeader from '../../components/NavHeader/NavHeader';
import { navigationRef } from '../../navigation/navigationRef';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { StorageClient } from '@wallet.storage/fetch-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import FileReader from 'react-native-filereader';
import { v4 as uuidv4 } from 'uuid';
import { WAS } from '../../../app.config';
import { useThemeContext } from '../../hooks';
import { removeWasPublicLink } from '../../lib/removeWasPublicLink';
import { shareBinaryFile } from '../../lib/shareData';
import { displayGlobalModal } from '../../lib/globalModal';
import { getRootSigner } from '../../lib/getRootSigner';

// Create a singleton instance of StorageClient
let storageClientInstance: InstanceType<typeof StorageClient> | null = null;

export function getStorageClient() {
  if (!storageClientInstance) {
    storageClientInstance = new StorageClient(new URL(WAS.BASE_URL));
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
      const signer = await getRootSigner();
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
      await AsyncStorage.removeItem(WAS.KEYS.SIGNER_KEYPAIR);
      await AsyncStorage.removeItem(WAS.KEYS.SPACE_ID);

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
      const spaceId = await AsyncStorage.getItem(WAS.KEYS.SPACE_ID);
      const keyPairJson = await AsyncStorage.getItem(WAS.KEYS.SIGNER_KEYPAIR);

      if (spaceId && keyPairJson) {
        setHasConnection(true);
        const keyPair = await Ed25519VerificationKey2020.from(JSON.parse(keyPairJson));
        setConnectionDetails({
          spaceId: `urn:uuid:${spaceId}`,
          controllerDid: keyPair.signer().id
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

      const key = await Ed25519VerificationKey2020.generate();
      const fp = key.fingerprint();
      const controllerDid = `did:key:${fp}`;
      key.controller = controllerDid;
      key.id = `${controllerDid}#${fp}`;
      const signer = key.signer();

      setMessage('Creating space...');

      // Generate a UUID for the space
      const spaceUUID = uuidv4();
      const spaceId = `urn:uuid:${spaceUUID}`;
      console.log('Space ID:', spaceId);

      // Use the singleton storage client
      const storage = getStorageClient();

      const space = storage.space({
        signer,
        id: spaceId as `urn:uuid:${string}`
      });

      const spaceObject = {
        id: spaceId,
        controller: controllerDid
      };

      console.log('Creating space with object:', spaceObject);
      const spaceObjectBlob = new Blob(
        [JSON.stringify(spaceObject)],
        { type: 'application/json' }
      );

      // Create the space
      const response = await space.put(spaceObjectBlob, {
        signer
      });

      console.log('Space PUT response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize space. Status: ${response.status}`);
      }

      const signerJson = await key.export({publicKey: true, privateKey: true});
      // Store the signer for future connections
      await AsyncStorage.setItem(
        WAS.KEYS.SIGNER_KEYPAIR,
        JSON.stringify(signerJson)
      );

      // Store the space UUID for future connections
      await AsyncStorage.setItem(WAS.KEYS.SPACE_ID, spaceUUID);
      console.log('Stored space ID in AsyncStorage:', spaceUUID);

      setStatus('success');
      setMessage('WAS storage successfully provisioned!');
      setHasConnection(true);
      setConnectionDetails({
        spaceId,
        controllerDid
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
      await AsyncStorage.removeItem(WAS.KEYS.SIGNER_KEYPAIR);
      await AsyncStorage.removeItem(WAS.KEYS.SPACE_ID);
    }
  };

  // const exportSpace = async () => {
  //   try {
  //     setStatus('loading');
  //     setMessage('Exporting space...');
  //
  //     if (!connectionDetails) throw new Error('No connection details found');
  //
  //     const confirmed = await displayGlobalModal({
  //       title: 'Export Space',
  //       confirmText: 'Export',
  //       cancelOnBackgroundPress: true,
  //       body: (
  //         <Text style={{ color: theme.color.textPrimary }}>
  //           This will export your entire WAS space as a tarball file.
  //         </Text>
  //       )
  //     });
  //
  //     if (!confirmed) {
  //       setStatus('idle');
  //       setMessage('');
  //       return;
  //     }
  //
  //
  //     const signer = await getRootSigner();
  //     const storage = getStorageClient();
  //
  //     const space = storage.space({
  //       signer,
  //       id: connectionDetails.spaceId as `urn:uuid:${string}`,
  //     });
  //
  //     const response = await space.get({
  //       headers: {
  //         Accept: 'application/x-tar'
  //       }
  //     });
  //
  //     if (!response.ok) throw new Error(`Failed to export space. Status: ${response.status}`);
  //
  //     const blob = await response.blob?.();
  //     if (!blob) throw new Error('Failed to get blob from response');
  //
  //     const fileName = `was-space-${connectionDetails.spaceId.split('urn:uuid:')[1]}.tar`;
  //     console.log('fileName:', fileName);
  //
  //     const reader = new FileReader();
  //
  //     const base64 = await new Promise<string>((resolve, reject) => {
  //       reader.onloadend = () => {
  //         const dataUrl = reader.result as string;
  //         const base64Data = dataUrl.split(',')[1]; // strip "data:*/*;base64,"
  //         resolve(base64Data);
  //       };
  //       reader.onerror = reject;
  //       reader.readAsDataURL(blob);
  //     });
  //
  //     try {
  //       await shareBinaryFile(fileName, base64, 'application/x-tar');
  //     } catch (err) {
  //       await shareBinaryFile(fileName, base64, 'application/x-tar');
  //     }
  //
  //     setStatus('success');
  //     setMessage('Space exported and ready to share!');
  //   } catch (err) {
  //     console.error('Error exporting space:', err);
  //     setStatus('error');
  //     setMessage(err instanceof Error ? `Error: ${err.message}` : 'Failed to export space');
  //   }
  // };

  const renderConnectionDetails = () => {
    if (!connectionDetails) return null;

    const spaceUrl = `${WAS.BASE_URL}/space/${
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
            {WAS.BASE_URL}
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
          {/*<TouchableOpacity*/}
          {/*  style={[*/}
          {/*    styles.connectButton,*/}
          {/*    { backgroundColor: theme.color.buttonPrimary },*/}
          {/*  ]}*/}
          {/*  onPress={exportSpace}*/}
          {/*>*/}
          {/*  <Text*/}
          {/*    style={[*/}
          {/*      styles.connectButtonText,*/}
          {/*      { color: theme.color.textPrimary },*/}
          {/*    ]}*/}
          {/*  >*/}
          {/*    Export Space*/}
          {/*  </Text>*/}
          {/*</TouchableOpacity>*/}
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
