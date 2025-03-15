import React from 'react';
import { Text } from 'react-native-elements';
// import '@digitalcredentials/data-integrity-rn';
import { Ed25519Signature2020 } from '@digitalcredentials/ed25519-signature-2020';
import { Ed25519VerificationKey2020 } from '@digitalcredentials/ed25519-verification-key-2020';
import { ConfirmModal } from '../../components';
import { useAppDispatch, useDynamicStyles } from '../../hooks';
import { navigationRef } from '../../navigation';
import { makeSelectDidFromProfile, selectWithFactory } from '../../store/selectorFactories';
import { stageCredentials } from '../../store/slices/credentialFoyer';
import { handleVcApiExchangeComplete } from '../../lib/exchanges';
import { clearGlobalModal, displayGlobalModal } from '../../lib/globalModal';
import GlobalModalBody from '../../lib/globalModalBody';
import { NavigationUtil } from '../../lib/navigationUtil';
import { delay } from '../../lib/time';
import { ExchangeCredentialsProps } from './ExchangeCredentials.d';

export default function ExchangeCredentials({ route }: ExchangeCredentialsProps): React.ReactElement {
  const { params } = route;
  const { request } = params;

  const dispatch = useAppDispatch();
  const { mixins } = useDynamicStyles();

  const dataLoadingPendingModalState = {
    title: 'Retrieving Credential',
    confirmButton: false,
    cancelButton: false,
    body: <GlobalModalBody message='This will only take a moment.' loading={true} />
  };

  const dataLoadingSuccessModalState = {
    title: 'Success',
    confirmButton: true,
    confirmText: 'OK',
    cancelButton: false,
    body: <GlobalModalBody message='You have successfully delivered credentials to the organization.' />
  };

  const acceptExchange = async () => {
    const rawProfileRecord = await NavigationUtil.selectProfile();
    displayGlobalModal(dataLoadingPendingModalState);
    const didRecord = selectWithFactory(makeSelectDidFromProfile, { rawProfileRecord });
    const holder = didRecord?.didDocument.authentication[0].split('#')[0] as string;
    const key = await Ed25519VerificationKey2020.from(didRecord?.verificationKey);
    const suite = new Ed25519Signature2020({ key });
    const url = request.protocols.vcapi as string;
    console.log('CHAPI: Sending initial {} request to:', url);
    const response = await handleVcApiExchangeComplete({
      url,
      holder,
      suite,
      interactive: true
    });
    console.log('Response:', JSON.stringify(response, null, 2));

    const credentialField = response.verifiablePresentation?.verifiableCredential;
    const credentialFieldExists = !!credentialField;
    const credentialFieldIsArray = Array.isArray(credentialField);
    const credentialAvailable = credentialFieldExists && credentialFieldIsArray && credentialField.length > 0;
    clearGlobalModal();
    if (credentialAvailable && navigationRef.isReady()) {
      const credential = credentialField[0];
      await dispatch(stageCredentials([credential]));
      await delay(500);
      navigationRef.navigate('AcceptCredentialsNavigation', {
        screen: 'ApproveCredentialsScreen',
        params: {
          rawProfileRecord
        }
      });
    } else {
      console.log('Credential not available.');
      displayGlobalModal(dataLoadingSuccessModalState);
      navigationRef.goBack();
    }
  };

  const rejectExchange = () => {
    navigationRef.goBack();
  };

  return (
    <ConfirmModal
      onConfirm={acceptExchange}
      onCancel={rejectExchange}
      onRequestClose={rejectExchange}
      title="Exchange Credentials Request"
      confirmText="Yes"
      cancelText="No">
      <Text style={mixins.modalBodyText}>
        An organization would like to exchange credentials with you.
      </Text>
      <Text style={mixins.modalBodyText}>
        Would you like to continue?
      </Text>
    </ConfirmModal>
  );
}
