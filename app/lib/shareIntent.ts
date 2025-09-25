import ReceiveSharingIntent from 'react-native-receive-sharing-intent';

import { ReceivedFilePayload } from '../types/receiveSharingIntent';

import store from '../store';
import { stageCredentials } from '../store/slices/credentialFoyer';
import { Credential } from '../types/credential';
import { navigationRef } from '../navigation/navigationRef';
import { displayGlobalModal } from '../lib/globalModal';
import { credentialsFrom } from './decode';
import { readFile } from './import';
import { NavigationUtil } from './navigationUtil';

export async function onShareIntent(): Promise<void> {
  const files = await getReceivedFiles();
  if (files.length === 0) return;

  const credentials: Credential[] = [];
  let hasError = false;

  await Promise.all(files.map(async ({ filePath }) => {
    try {
      const fileData = await readFile(filePath);
      const fileCredentials = await credentialsFrom(fileData);
      credentials.push(...fileCredentials);
    } catch (err) {
      hasError = true;
      console.warn(err);
    }
  }));

  if (hasError) {
    displayGlobalModal({
      title: 'Unable to Add Credentials', 
      body: 'Ensure the file contains one or more credentials, and is a supported file type.',
      cancelButton: false,
      confirmText: 'Close',
    });
  } else {
    store.dispatch(stageCredentials(credentials));

    const rawProfileRecord = await NavigationUtil.selectProfile();
    navigationRef.navigate('AcceptCredentialsNavigation', { 
      screen: 'ApproveCredentialsScreen',
      params: {
        rawProfileRecord,
      }
    });
  }
}

async function getReceivedFiles(): Promise<ReceivedFilePayload[]> {
  const SHARE_URL_PROTOCOL = 'org.dcconsortium';

  return new Promise((resolve, reject) => {
    const onSuccess = (files: ReceivedFilePayload[]) => resolve(files);
    const onFailed = (error: unknown) => {
      console.log('Error in getReceivedFiles:');
      console.log(error);
      reject(error);
    };

    ReceiveSharingIntent.getReceivedFiles(onSuccess, onFailed, SHARE_URL_PROTOCOL);
  });
}
