import React from 'react';
import { ScrollView, Text } from 'react-native';

import NavHeader from '../../components/NavHeader/NavHeader';
import VerificationCard from '../../components/VerificationCard/VerificationCard';
import VerificationStatusCard from '../../components/VerificationStatusCard/VerificationStatusCard';
import { useDynamicStyles } from '../../hooks';

import type { VerificationStatusScreenProps } from './VerificationStatusScreen.d';
import dynamicStyleSheet from './VerificationStatusScreen.styles';

export default function VerificationStatusScreen({
  navigation,
  route,
}: VerificationStatusScreenProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const { credential, verifyPayload } = route.params;

  return (
    <>
      <NavHeader
        title="Verification Status"
        goBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.container}>
        <VerificationCard verifyPayload={verifyPayload} showDetails/>
        <VerificationStatusCard credential={credential} verifyPayload={verifyPayload} />
        <Text style={styles.footerText}>
         The Wallet will periodically check the verification status of
         your credential. Please make sure you’ve connected to a network recently to
         ensure your credential can be verified. If you’re still having problems,
         please contact your issuing organization.
        </Text>
      </ScrollView>
    </>
  );
}
