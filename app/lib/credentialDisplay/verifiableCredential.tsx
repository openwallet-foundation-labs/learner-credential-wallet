import moment from 'moment';
import React from 'react';
import { View, Text, ImageSourcePropType } from 'react-native';
import { Button } from 'react-native-elements';
import { mixins } from '../../styles';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.d';
import { CredentialStatusBadges } from '../../components';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import { getIssuanceDate } from '../credentialValidityPeriod';
import type { CredentialCardProps, CredentialDisplayConfig } from '.';
import defaultIssuerImage from '../../assets/defaultIssuer.png';
import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  CardImage,
  issuerRenderInfoWithVerification,
  credentialSubjectRenderInfoFrom,
  IssuerInfoButton
} from './shared';


import { DATE_FORMAT } from '../../../app.config';
const getSafeImageSource = (imageUri?: string | null): ImageSourcePropType => {
  return imageUri && imageUri.trim() !== '' ? { uri: imageUri } : defaultIssuerImage;
};

type NavigationProp = StackNavigationProp<CredentialNavigationParamList>;

function VerifiableCredentialCard({ rawCredentialRecord }: CredentialCardProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const { credential } = rawCredentialRecord;
  const verifyCredential = useVerifyCredential(rawCredentialRecord);
  const navigation = useNavigation<NavigationProp>();
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
  } = issuerRenderInfoWithVerification(issuer, verifyCredential?.result);

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
          <CardImage source={getSafeImageSource(issuerImage)} accessibilityLabel={issuerName} />
          <View style={styles.spaceBetween}>
            <IssuerInfoButton
              issuerId={issuerId}
              issuerName={issuerName}
              onPress={() => {
                if (issuerId && rawCredentialRecord) {
                  navigation.navigate('IssuerInfoScreen', {
                    issuerId,
                    rawCredentialRecord,
                  });
                } else {
                  console.warn('Missing issuerId or rawCredentialRecord');
                }
              }}
            />
            <View style={styles.issuerContent}>
              <CardLink url={issuerUrl} />
            </View>
          </View>
        </View>

        <Button
          title="Issuer Details"
          buttonStyle={mixins.buttonPrimary}
          containerStyle={styles.issuerButton}
          titleStyle={mixins.buttonTitle}
          onPress={() => {
            if (issuerId && rawCredentialRecord) {
              navigation.navigate('IssuerInfoScreen', {
                issuerId,
                rawCredentialRecord,
              });
            } else {
              console.warn('Missing issuerId or rawCredentialRecord');
            }
          }}
        />
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


export const verifiableCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'VerifiableCredential',
  cardComponent: VerifiableCredentialCard,
  itemPropsResolver: ({ credentialSubject, issuer }) => {
    const { title, achievementImage } = credentialSubjectRenderInfoFrom(credentialSubject);
    const { issuerName, issuerImage } = issuerRenderInfoWithVerification(issuer);

    return {
      title,
      subtitle: issuerName,
      image: achievementImage || issuerImage || defaultIssuerImage,
    };
  }
};