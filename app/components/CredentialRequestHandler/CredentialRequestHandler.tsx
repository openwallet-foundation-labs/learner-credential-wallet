import React, { useEffect, useState } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { Text, View } from 'react-native';
import AnimatedEllipsis from 'rn-animated-ellipsis';

import ConfirmModal from '../ConfirmModal/ConfirmModal';
import { useAppDispatch, useDynamicStyles } from '../../hooks';
import { isCredentialRequestParams, requestCredential } from '../../lib/credentialRequest';
import { ProfileRecordRaw } from '../../model';
import { selectWithFactory } from '../../store/selectorFactories';
import { makeSelectDidFromProfile } from '../../store/selectorFactories/makeSelectDidFromProfile';
import dynamicStyleSheet from './CredentialRequestHandler.styles';
import { stageCredentialsForProfile } from '../../store/slices/credentialFoyer';
import { IVerifiableCredential } from '@digitalcredentials/ssi';
import {navigationRef} from '../../navigation';

type CredentialRequestHandlerProps = {
  credentialRequestParams: Record<string, unknown> | undefined;
  rawProfileRecord: ProfileRecordRaw;
  onFailed: () => void;
}

export default function CredentialRequestHandler({
  credentialRequestParams, rawProfileRecord, onFailed
}: CredentialRequestHandlerProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const dispatch = useAppDispatch();
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const credentialRequest = useAsyncCallback(requestCredential, { onSuccess: onFinish,
    onError: () => {
      setModalIsOpen(false);
      if (navigationRef.isReady()) {
        navigationRef.navigate('HomeNavigation', {
          screen: 'CredentialNavigation',
          params: {
            screen: 'HomeScreen',
          },
        });
      }
    }});
  const errorMessage = credentialRequest.error?.message;

  async function onFinish(credentials: IVerifiableCredential[]) {
    setModalIsOpen(false);
    await dispatch(stageCredentialsForProfile({ credentials, profileRecordId: rawProfileRecord._id }));
  }

  function onRequestClose() {
    setModalIsOpen(false);
    if (errorMessage) {
      onFailed();
    }
  }

  useEffect(() => {
    if (isCredentialRequestParams(credentialRequestParams)) {
      setModalIsOpen(true);
      const rawDidRecord = selectWithFactory(makeSelectDidFromProfile, { rawProfileRecord });
      credentialRequest.execute(credentialRequestParams, rawDidRecord);
    }
  }, [credentialRequestParams, rawProfileRecord]);

  return (
    <ConfirmModal
      open={modalIsOpen}
      onRequestClose={onRequestClose}
      confirmButton={!credentialRequest.loading}
      cancelOnBackgroundPress={!credentialRequest.loading}
      cancelButton={false}
      title="Handling Credential Request"
      confirmText="Close"
    >
      {credentialRequest.loading ? (
        <View style={styles.loadingContainer}>
          <AnimatedEllipsis style={styles.loadingDots} minOpacity={0.4} animationDelay={200} useNativeDriver={true} />
        </View>
      ) : (
        <Text style={styles.modalText}>{errorMessage}</Text>
      )}
    </ConfirmModal>
  );
}
