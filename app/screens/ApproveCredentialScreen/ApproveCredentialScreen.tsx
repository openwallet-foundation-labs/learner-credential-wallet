import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';

//import { CredentialCard, VerificationCard, VerificationStatusCard } from '../../components';
import { CredentialCard, VerificationStatusCard } from '../../components';
import { NavHeader } from '../../components';
import type { ApproveCredentialScreenProps } from './ApproveCredentialScreen.d';
import { CredentialRecord } from '../../model';
import dynamicStyleSheet from './ApproveCredentialScreen.styles';
import { useDynamicStyles, usePendingCredential } from '../../hooks';
import { navigationRef } from '../../navigation';
import { useVerifyCredential } from '../../hooks';

export default function ApproveCredentialScreen({ navigation, route }: ApproveCredentialScreenProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const { pendingCredentialId, profileRecordId } = route.params;
  const pendingCredential = usePendingCredential(pendingCredentialId);
  const { credential } = pendingCredential;
  const rawCredentialRecord = useMemo(() => CredentialRecord.rawFrom({ credential, profileRecordId }), [credential]);
  const verifyPayload = useVerifyCredential(rawCredentialRecord, true);

  function goToIssuerInfo(issuerId: string) {
    if (navigationRef.isReady()) {
      navigationRef.navigate('AcceptCredentialsNavigation', {
        screen: 'IssuerInfoScreen',
        params: { issuerId, rawCredentialRecord}
      });
    }
  }

  return (
    <>
      <NavHeader title="Credential Preview" goBack={navigation.goBack} />
      <ScrollView>
        <View style={styles.container}>
          <CredentialCard rawCredentialRecord={rawCredentialRecord} onPressIssuer={goToIssuerInfo} />
          {/* <VerificationCard rawCredentialRecord={rawCredentialRecord} isButton /> */}
          {verifyPayload && <VerificationStatusCard credential={credential} verifyPayload={verifyPayload} />}
        </View>
      </ScrollView>
    </>
  );
}
