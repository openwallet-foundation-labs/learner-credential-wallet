import moment from 'moment';
import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-elements';
import { mixins } from '../../styles';

import { CredentialStatusBadges } from '../../components';
import { useDynamicStyles } from '../../hooks';
import { getExpirationDate, getIssuanceDate } from '../credentialValidityPeriod';
import type { CredentialCardProps, CredentialDisplayConfig } from '.';
import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  CardImage,
  IssuerInfoButton,
  issuerRenderInfoFrom,
  credentialSubjectRenderInfoFrom
} from './shared';
import { DATE_FORMAT } from '../../../app.config';
import { navigationRef } from '../../navigation';

export const openBadgeCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'OpenBadgeCredential',
  cardComponent: OpenBadgeCredentialCard,
  itemPropsResolver: ({ credentialSubject, issuer }) => {
    const { title, achievementImage } = credentialSubjectRenderInfoFrom(credentialSubject);
    const { issuerName, issuerImage } = issuerRenderInfoFrom(issuer);

    return {
      title,
      subtitle: issuerName,
      image: achievementImage || issuerImage,
    };
  }
};

function OpenBadgeCredentialCard({ rawCredentialRecord }: CredentialCardProps): React.ReactElement {
  //const verifyCredential = useVerifyCredential(rawCredentialRecord);
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const { credential } = rawCredentialRecord;
  const { credentialSubject, issuer, name } = credential;

  const issuanceDate = getIssuanceDate(credential);
  const expirationDate = getExpirationDate(credential);
  const formattedIssuanceDate = issuanceDate ? moment(issuanceDate).format(DATE_FORMAT) : 'N/A';
  const formattedExpirationDate = expirationDate ? moment(expirationDate).format(DATE_FORMAT) : 'N/A';

  // const registeredIssuerLog = verifyCredential?.result?.log?.find(
  //   (item) => item.id === 'registered_issuer'
  // ) as { matchingIssuers?: unknown[] } | undefined;

  //const matchingIssuers = registeredIssuerLog?.matchingIssuers ?? [];

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
  const credentialName = Array.isArray(credentialSubject.achievement)
    ? credentialSubject.achievement.at(0)?.name ?? null
    : credentialSubject.achievement?.name ?? null;

  const {
    issuerName,
    issuerUrl,
    issuerId,
    issuerImage,
  } = issuerRenderInfoFrom(issuer);

 
  const handleIssuerPress = (id: string, record: typeof rawCredentialRecord) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('HomeNavigation', {
        screen: 'CredentialNavigation',
        params: {
          screen: 'IssuerInfoScreen',
          params: {
            issuerId: id,
            rawCredentialRecord: record,
          },
        },
      });
    }
  };

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
          <CardImage source={issuerImage} accessibilityLabel={issuerName} />
          <View style={styles.spaceBetween}>
            <IssuerInfoButton issuerId={issuerId} issuerName={issuerName}  onPress={() => {
              if (issuerId && rawCredentialRecord) {
                handleIssuerPress(issuerId, rawCredentialRecord);
              } else {
                console.warn('Missing issuerId or rawCredentialRecord');
              }
            }} />
            <View style={styles.issuerContent}>
              <CardLink url={issuerUrl} />
            </View>
          </View>
  

     
        </View>
        {/* {matchingIssuers.length > 0 && issuerId && ( */}
        <Button
          title="Issuer Details"
          buttonStyle={mixins.buttonPrimary}
          containerStyle={styles.issuerButton}
          titleStyle={mixins.buttonTitle}
          onPress={() => {
            if (issuerId && rawCredentialRecord) {
              handleIssuerPress(issuerId, rawCredentialRecord);
            } else {
              console.warn('Missing issuerId or rawCredentialRecord');
            }
          }}
        />
        {/* )} */}

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
}
