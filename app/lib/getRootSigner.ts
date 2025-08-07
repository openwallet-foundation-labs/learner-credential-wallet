import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS_KEYS } from '../../app.config';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';

export async function getRootSigner() {
  const rootSignerSerializedKeypair = await AsyncStorage.getItem(WAS_KEYS.SIGNER_KEYPAIR);
  if (!rootSignerStr) {
    throw new Error('Root signer not found in wallet.');
  }

  const key = await Ed25519VerificationKey2020.from(JSON.parse(rootSignerStr));
  return key;
}
