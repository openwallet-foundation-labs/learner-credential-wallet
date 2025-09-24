import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS } from '../../app.config';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { ISigner } from '@digitalcredentials/ssi';

export async function getRootSigner(): Promise<ISigner | undefined> {
  if (!WAS.enabled) {
    console.log('Cannot get root signer, WAS disabled in config.');
    return;
  }
  const rootSignerSerializedKeypair = await AsyncStorage.getItem(WAS.KEYS.SIGNER_KEYPAIR);
  if (!rootSignerSerializedKeypair) {
    console.log('Cannot get root signer, key pair not in storage.');
    return;
  }

  const key = await Ed25519VerificationKey2020.from(JSON.parse(rootSignerSerializedKeypair));
  return key.signer();
}
