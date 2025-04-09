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

      const space = await WalletStorage.provisionSpace({
        url: 'https://data.pub',
        signer: appDidSigner,
      });

      console.log('🚀 ~ Space provisioned:', space);

      const nonce = 'hello world ';
      const initialData = new Blob([nonce], { type: 'text/plain' });

      const resource = space.resource('my-test-data');

      const putRes = await resource.put(initialData);
      console.log('PUT status:', putRes.status);
      console.log('Data stored:', nonce);

      const response = await resource.get();
      console.log('🚀 ~ testingWalletStorage ~ response:', response);

      if (!response.ok) {
        console.error('❌ Failed to get resource:', response.status);
        return;
      }

      const blob = await response.blob();
      console.log('🚀 ~ testingWalletStorage ~ blob:', blob);
    } catch (error) {
      console.error('💥 Error in wallet storage test:', error);
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
