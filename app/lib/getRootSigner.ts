import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS_KEYS } from '../../app.config';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { Ed25519Signer } from '@did.coop/did-key-ed25519';

export async function getRootVerificationSigner() {
  const rootSignerStr = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
  if (!rootSignerStr) {
    throw new Error('Root signer not found in wallet.');
  }
  const rootSigner = await Ed25519VerificationKey2020.from(
    JSON.parse(rootSignerStr)
  );

  return rootSigner;
}

export async function getRootSigner() {
  const rootSignerStr = await AsyncStorage.getItem(WAS_KEYS.SIGNER_JSON);
  if (!rootSignerStr) {
    throw new Error('Root signer not found in wallet.');
  }
  const rootSigner = await Ed25519Signer.fromJSON(rootSignerStr);
  return rootSigner;
} 
