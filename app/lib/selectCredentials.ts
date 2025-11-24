import { ObjectId } from 'bson'
import store from '../store'
import { navigationRef } from '../navigation'
import {
  clearSelectedExchangeCredentials,
  selectExchangeCredentials
} from '../store/slices/credentialFoyer'
import { clearGlobalModal, displayGlobalModal } from './globalModal'
import { getGlobalModalBody } from './globalModalBody'
import { delay } from './time'
import { CredentialRecordRaw } from '../types/credential'

// Selects credentials to exchange with issuer or verifier
export async function selectCredentials (credentialRecords: CredentialRecordRaw[], profileId?: string): Promise<CredentialRecordRaw[]> {
  // ensure that the selected credentials have been cleared
  // before subscribing to redux store updates below
  store.dispatch(clearSelectedExchangeCredentials())
  console.log('Store dispatch cleared..')
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const selectedExchangeCredentials: CredentialRecordRaw[] =
      store.getState().credentialFoyer.selectedExchangeCredentials
    if (selectedExchangeCredentials.length === 0) {
      break
    } else {
      await delay(500)
    }
  }

  let resolvePromise: (value: CredentialRecordRaw[]) => void
  const selectionPromise = new Promise(
    (resolve: (value: CredentialRecordRaw[]) => void) => {
      resolvePromise = resolve
    }
  )

  const unsubscribe = store.subscribe(async () => {
    // increase likelihood that the selected credentials
    // have been recorded before processing them
    await delay(1000)
    const selectedExchangeCredentials: CredentialRecordRaw[] =
      store.getState().credentialFoyer.selectedExchangeCredentials
    if (selectedExchangeCredentials.length > 0) {
      resolvePromise(selectedExchangeCredentials)
      unsubscribe()
      store.dispatch(clearSelectedExchangeCredentials())
    }
  })

  clearGlobalModal()
  const credentialRecordIds = credentialRecords.map(
    (r: CredentialRecordRaw) => r._id
  )
  const credentialFilter = (r: CredentialRecordRaw) => {
    const matchesId = credentialRecordIds.some((id: ObjectId) => r._id.equals(id));
    const matchesProfile = !profileId || r.profileRecordId.toHexString() === profileId;
    return matchesId && matchesProfile;
  };

  console.log('Navigating to Share Credentials')

  navigationRef.navigate('CredentialSelectionScreen', {
    title: 'Share Credentials',
    instructionText: 'Select credentials to share.',
    credentialFilter,
    isVPRFlow: true,
    goBack: () => {
      displayGlobalModal({
        title: 'Cancel Send',
        confirmButton: false,
        cancelButton: false,
        body: getGlobalModalBody('Ending credential request. To send credentials, open another request.', true)
      });
      store.dispatch(clearSelectedExchangeCredentials());
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: { screen: 'HomeScreen' }
      });
      setTimeout(clearGlobalModal, 10000);
    },
    onSelectCredentials: (s: CredentialRecordRaw[]) => {
      displayGlobalModal({
        title: 'Sending Credential',
        confirmButton: false,
        cancelButton: false,
        body: getGlobalModalBody('This will only take a moment.', true)
      });
      store.dispatch(selectExchangeCredentials(s));
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: { screen: 'HomeScreen' }
      });
    }
  })

  return selectionPromise
}
