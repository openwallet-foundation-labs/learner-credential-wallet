import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS } from '../../app.config';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { ISigner } from '@digitalcredentials/ssi';

export async function getRootSigner(): Promise<ISigner> {
  if (!WAS.enabled) {
    throw new Error('WAS is not enabled.');
  }
  const rootSignerSerializedKeypair = await AsyncStorage.getItem(WAS.KEYS.SIGNER_KEYPAIR);
  if (!rootSignerSerializedKeypair) {
    throw new Error('Root signer not found in wallet.');
  }

  const key = await Ed25519VerificationKey2020.from(JSON.parse(rootSignerSerializedKeypair));
  return key.signer();
}
