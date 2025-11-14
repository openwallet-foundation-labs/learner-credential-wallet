import { StorageClient } from '@wallet.storage/fetch-client';
import { WAS } from '../../app.config';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRootSigner } from './getRootSigner';
import { removeWasPublicLink } from './removeWasPublicLink';

// Create a singleton instance of StorageClient
let storageClientInstance: InstanceType<typeof StorageClient> | null = null;

export function getStorageClient() {
  if (!storageClientInstance) {
    storageClientInstance = new StorageClient(new URL(WAS.BASE_URL));
  }
  return storageClientInstance;
}

export async function generateRootKey (): Promise<{ controllerDid: string, key: Ed25519VerificationKey2020 }> {
  const key = await Ed25519VerificationKey2020.generate();
  const fp = key.fingerprint();
  const controllerDid = `did:key:${fp}`;
  key.controller = controllerDid;
  key.id = `${controllerDid}#${fp}`;
  return { controllerDid, key };
}

export async function provisionWasSpace(): Promise<{ spaceId: string, controllerDid: string }> {
  // For the moment, we're using a single root key for the whole wallet,
  // for the WAS connection (instead of a separate connection per profile)
  const { controllerDid, key } = await generateRootKey();
  const signer = key.signer();

  // Generate a UUID for the space
  const spaceUUID = uuidv4();
  const spaceId = `urn:uuid:${spaceUUID}`;
  console.log('Space ID:', spaceId);

  // Use the singleton storage client
  const storage = getStorageClient();

  const space = storage.space({
    signer, id: spaceId as `urn:uuid:${string}`
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
    throw new Error(`Failed to initialize space. Status: ${ response.status }`);
  }

  const signerJson = await key.export({ publicKey: true, privateKey: true });
  // Store the signer for future connections
  await AsyncStorage.setItem(
    WAS.KEYS.SIGNER_KEYPAIR,
    JSON.stringify(signerJson)
  );

  // Store the space UUID for future connections
  await AsyncStorage.setItem(WAS.KEYS.SPACE_ID, spaceUUID);
  console.log('Stored space ID in AsyncStorage:', spaceUUID);

  return { spaceId, controllerDid };
}

export async function deleteWasSpace({ spaceId }: { spaceId: string }): Promise<void> {
  // Get the stored signer
  const signer = await getRootSigner();
  const storage = getStorageClient();
  const space = storage.space({
    signer,
    id: spaceId as `urn:uuid:${string}`,
  });

  // Delete the space
  const response = await space.delete({
    signer,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete space. Status: ${ response.status }`);
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
}

