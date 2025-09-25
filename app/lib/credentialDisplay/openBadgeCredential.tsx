import moment from 'moment';
import React from 'react';
import { View, Text, ImageSourcePropType } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.d';
import { Button } from 'react-native-elements';
import { mixins } from '../../styles';

import CredentialStatusBadges from '../../components/CredentialStatusBadges/CredentialStatusBadges';
import { useDynamicStyles, useVerifyCredential } from '../../hooks';
import { getExpirationDate, getIssuanceDate } from '../credentialValidityPeriod';
import type { CredentialCardProps, CredentialDisplayConfig } from '.';
import defaultIssuerImage from '../../assets/defaultIssuer.png';

import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  CardImage,
  issuerRenderInfoWithVerification,
  IssuerInfoButton,
  credentialSubjectRenderInfoFrom
} from './shared';

import { DATE_FORMAT } from '../../../app.config';
import { getCredentialName } from '../credentialName';

const getSafeImageSource = (imageUri?: string | null): ImageSourcePropType => {
  return imageUri && imageUri.trim() !== '' ? { uri: imageUri } : defaultIssuerImage;
};


type NavigationProp = StackNavigationProp<CredentialNavigationParamList>;
const OpenBadgeCredentialCard = ({ rawCredentialRecord }: CredentialCardProps): React.ReactElement => {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const { credential } = rawCredentialRecord;
  const verifyCredential = useVerifyCredential(rawCredentialRecord);

  const navigation = useNavigation<NavigationProp>();

  const { credentialSubject, issuer, name } = credential;

  const issuanceDate = getIssuanceDate(credential);
  const expirationDate = getExpirationDate(credential);
  const formattedIssuanceDate = issuanceDate ? moment(issuanceDate).format(DATE_FORMAT) : 'N/A';
  const formattedExpirationDate = expirationDate ? moment(expirationDate).format(DATE_FORMAT) : 'N/A';

  const {
    issuedTo,
    description,
    criteria,
    numberOfCredits,
    startDateFmt,
    endDateFmt,
    achievementImage,
    achievementType
  } = credentialSubjectRenderInfoFrom(credentialSubject);

  const issuedToName: string = issuedTo || (name as string);
  const credentialName = getCredentialName(credential);

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

        <View style={[styles.flexRow, styles.dataContainer]}>
          <View>
            {achievementImage && (
              <CardImage source={achievementImage} accessibilityLabel={issuerName} />
            )}
          </View>
          <View style={styles.spaceBetween}>
            <View style={styles.flexRow}>
              <Text style={styles.headerInRow} accessibilityRole="header">
                {credentialName}
              </Text>
            </View>
            <CardDetail label="Achievement Type" value={achievementType} inRow={true} />
          </View>
        </View>

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

        <View style={styles.dateStyles}>
          <CardDetail label="Issuance Date" value={formattedIssuanceDate} />
          <CardDetail label="Expiration Date" value={formattedExpirationDate} />
        </View>
        <CardDetail label="Issued To" value={issuedToName} />
        <CardDetail label="Number of Credits" value={numberOfCredits} />
        <View style={styles.flexRow}>
          <CardDetail label="Start Date" value={startDateFmt} />
          <CardDetail label="End Date" value={endDateFmt} />
        </View>
        <CardDetail label="Description" value={description} />
        <CardDetail label="Criteria" value={criteria} isMarkdown={true} />
      </View>
    </View>
  );
};

export const openBadgeCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'OpenBadgeCredential',
  cardComponent: OpenBadgeCredentialCard,
  itemPropsResolver: ({ credentialSubject, issuer }) => {
    const { title, achievementImage } = credentialSubjectRenderInfoFrom(credentialSubject);
    const { issuerName, issuerImage } = issuerRenderInfoWithVerification(issuer, undefined);

    return {
      title,
      subtitle: issuerName,
      image: achievementImage || issuerImage || defaultIssuerImage,
    };
  }
};
