import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavHeader } from '../../components';
import { navigationRef } from '../../navigation';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';
import { WalletStorage } from '@did-coop/wallet-attached-storage';

const WASScreen = () => {
  const testingWalletStorage = async () => {
    const appDidSigner = await Ed25519Signer.generate();
    console.log('🚀 ~ testingWalletStorage ~ appDidSigner:', appDidSigner);

    const space = await WalletStorage.provisionSpace({
      url: 'https://cors-anywhere.herokuapp.com/https://data.pub',
      signer: appDidSigner,
    });
    console.log('🚀 ~ testingWalletStorage ~ space:', space);
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
          <Text style={styles.text}>Hello!</Text>
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
  text: {
    fontSize: 24,
    color: 'white',
  },
});

export default WASScreen;
