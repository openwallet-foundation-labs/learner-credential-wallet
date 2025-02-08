import moment from 'moment';
import React from 'react';
import { View, Text } from 'react-native';

import { CredentialStatusBadges } from '../../components';
import { useDynamicStyles } from '../../hooks';
import { getIssuanceDate } from '../credentialValidityPeriod';
import type { CredentialCardProps, CredentialDisplayConfig } from '.';
import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  IssuerInfoButton,
  CardImage,
  issuerRenderInfoFrom,
  credentialSubjectRenderInfoFrom
} from './shared';
import {DATE_FORMAT} from '../../../app.config';

export const verifiableCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'VerifiableCredential',
  cardComponent: VerifiableCredentialCard,
  itemPropsResolver: ({ credentialSubject, issuer }) => {
    const { title } = credentialSubjectRenderInfoFrom(credentialSubject);
    const { issuerName, issuerImage } = issuerRenderInfoFrom(issuer);

    return {
      title,
      subtitle: issuerName,
      image: issuerImage,
    };
  }
};

function VerifiableCredentialCard({ rawCredentialRecord, onPressIssuer }: CredentialCardProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const { credential } = rawCredentialRecord;
  const { credentialSubject, issuer } = credential;

  const issuanceDate = getIssuanceDate(credential);
  const formattedIssuanceDate = issuanceDate ? moment(issuanceDate).format(DATE_FORMAT) : 'N/A';

  const {
    title,
    description,
    criteria,
    subjectName,
    numberOfCredits,
    startDateFmt,
    endDateFmt,
  } = credentialSubjectRenderInfoFrom(credentialSubject);

  const {
    issuerName,
    issuerUrl,
    issuerId,
    issuerImage,
  } = issuerRenderInfoFrom(issuer);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dataContainer}>
        <CredentialStatusBadges
          rawCredentialRecord={rawCredentialRecord}
          badgeBackgroundColor={theme.color.backgroundPrimary}
        />
        <Text style={styles.header} accessibilityRole="header">{title}</Text>
        <Text style={styles.dataLabel}>Issuer</Text>
        <View style={styles.flexRow}>
          <CardImage source={issuerImage} accessibilityLabel={issuerName} />
          <View style={styles.spaceBetween}>
            <IssuerInfoButton issuerId={issuerId} issuerName={issuerName} onPress={onPressIssuer} />
            <CardLink url={issuerUrl} />
          </View>
        </View>
      </View>
      <CardDetail label="Issuance Date" value={formattedIssuanceDate} />
      <CardDetail label="Issued To" value={subjectName} />
      <CardDetail label="Number of Credits" value={numberOfCredits} />
      <View style={styles.flexRow}>
        <CardDetail label="Start Date" value={startDateFmt} />
        <CardDetail label="End Date" value={endDateFmt} />
      </View>
      <CardDetail label="Description" value={description} />
      <CardDetail label="Criteria" value={criteria} />
    </View>
  );
}
