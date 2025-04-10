if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
}

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavHeader } from '../../components';
import { navigationRef } from '../../navigation';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';
import { WalletStorage } from '@did-coop/wallet-attached-storage';

const WASScreen = () => {
  const testingWalletStorage = async () => {
    try {
      const appDidSigner = await Ed25519Signer.generate();
      console.log('Generated signer:', appDidSigner.id);

      // Extract the base DID without the verification method fragment
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

      const responseToPutSpace = await space.put(spaceObjectBlob);
      console.log('Space PUT response status:', responseToPutSpace.status);

      // Create resource
      const resourceName = 'test';
      const nonce = 'hello world ';
      const initialData = new Blob([nonce], { type: 'text/plain' });
      const resource = space.resource(resourceName);

      console.log('Resource path:', resource.path);

      await resource.put(initialData);

      // Try the standard GET through the library
      console.log('About to GET resource from path:', resource.path);
      const response = await resource.get({
        signer: appDidSigner,
      });

      console.log('Resource GET Status code:', response.status);

      if (response.ok) {
        try {
          const blob = await response.blob();
          const text = await new Response(blob).text();
          console.log('Retrieved content:', text);
        } catch (error) {
          console.error('Error reading content:', error);
        }
      }
    } catch (error) {
      console.error('Error in wallet storage test:', error);
    }
  };

  useEffect(() => {
    testingWalletStorage();
  }, []);
  return (
    <>
      <NavHeader
        title="W.A.S"
        goBack={navigationRef.goBack}
      />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text>Hello!</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WASScreen;
