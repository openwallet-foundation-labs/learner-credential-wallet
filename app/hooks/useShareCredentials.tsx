import React from 'react';
import { Text } from 'react-native';
import { Button } from 'react-native-elements';
import { LoadingIndicatorDots } from '../components';
import { errorMessageMatches } from '../lib/error';
import { clearGlobalModal, displayGlobalModal } from '../lib/globalModal';
import { createUnsignedPresentation, sharePresentation } from '../lib/present';
import { navigationRef } from '../navigation';
import { useDynamicStyles } from './useDynamicStyles';
import { CredentialRecordRaw } from '../types/credential';

export function useShareCredentials(): (credentials: CredentialRecordRaw[]) => Promise<void> {
  const { mixins } = useDynamicStyles();
  // const getDidFor = useSelectorCallback(makeSelectDidForCredential);

  function displayLoadingModal() {
    displayGlobalModal({
      title: 'Sending Credential(s)',
      confirmButton: false,
      cancelButton: false,
      body: <LoadingIndicatorDots />
    });
  }

  function displayErrorModal(err: Error) {
    function goToErrorSource() {
      clearGlobalModal();
      navigationRef.navigate('ViewSourceScreen', {
        screenTitle: 'Send Credential Error',
        data: String(err),
      });
    }

    displayGlobalModal({
      title: 'Unable to Send Credential(s)',
      cancelOnBackgroundPress: true,
      cancelButton: false,
      confirmText: 'Close',
      body: (
        <>
          <Text style={mixins.modalBodyText}>An error occurred while sending credential(s).</Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="Details"
            onPress={goToErrorSource}
          />
        </>
      )
    });
  }

  async function shareCredentials(rawCredentialRecords: CredentialRecordRaw[]) {
    /**
     * Right now we're leaving the presentation unsigned. To enable signed presentation sharing
     * Uncomment these lines and pass `rawDidRecord` to `sharePresentation`
     */
    // if (!verifyMatchingProfiles(credentials)) {
    //   throw new Error('Credentials must exist in same profile to be shared as a Verifiable Presentation.');
    // }

    // const rawDidRecord = getDidFor({ rawCredentialRecord: credentials[0] });
    const credentials = rawCredentialRecords.map(({ credential }) => credential);
    const presentation = createUnsignedPresentation(credentials);

    await sharePresentation(presentation);
  }

  return async (rawCredentialRecords: CredentialRecordRaw[]) => {
    try {
      displayLoadingModal();
      await shareCredentials(rawCredentialRecords);
      clearGlobalModal();
    } catch(err) {
      if (errorMessageMatches(err, 'User did not share')) return clearGlobalModal();
      displayErrorModal(err as Error);
    }
  };
}

// function verifyMatchingProfiles(credentials: CredentialRecordRaw[]): boolean {
//   const { profileRecordId } = credentials[0];
//   return credentials.every((credential) =>
//     credential.profileRecordId.equals(profileRecordId)
//   );
// }
