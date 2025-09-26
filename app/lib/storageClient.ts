import { StorageClient } from '@wallet.storage/fetch-client';
import { WAS } from '../../app.config';

// Create a singleton instance of StorageClient
let storageClientInstance: InstanceType<typeof StorageClient> | null = null;

export function getStorageClient() {
  if (!storageClientInstance) {
    storageClientInstance = new StorageClient(new URL(WAS.BASE_URL));
  }
  return storageClientInstance;
}