import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';

import { VerificationStatusCardProps, StatusItemProps } from './VerificationStatusCard.d';
import dynamicStyleSheet from './VerificationStatusCard.styles';
import { useDynamicStyles } from '../../hooks';
import { BulletList } from '../../components';
import { DidRegistryContext } from '../../init/registries';
import { StatusPurpose, hasStatusPurpose } from '../../lib/credentialStatus';
import { issuerInRegistries } from '../../lib/issuerInRegistries';
import { getExpirationDate } from '../../lib/credentialValidityPeriod';

import { DATE_FORMAT } from '../../../app.config';

enum LogId {
  ValidSignature = 'valid_signature',
  Expiration = 'expiration',
  IssuerDIDResolves = 'issuer_did_resolves',
  RevocationStatus = 'revocation_status',
  SuspensionStatus = 'suspension_status'
}

export default function VerificationStatusCard({ credential, verifyPayload }: VerificationStatusCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const registries = useContext(DidRegistryContext);

  const { issuer } = credential;

  const registryNames = issuerInRegistries({ issuer, registries });

  const details = verifyPayload.result.log?.reduce<Record<string, boolean>>((acc, log) => {
    acc[log.id] = log.valid;
    return acc;
  }, {}) || {};

  const expirationDate = getExpirationDate(credential);
  const hasExpirationDate = expirationDate !== undefined;
  const expirationDateFmt = moment(expirationDate).format(DATE_FORMAT);
  const isExpired = moment() >= moment(expirationDate);

  const expirationText = hasExpirationDate
    ? isExpired
      ? `(expired on ${expirationDateFmt})`
      : `(expires on ${expirationDateFmt})`
    : '';

  const hasCredentialStatus = credential.credentialStatus !== undefined;
  const hasRevocationStatus = hasStatusPurpose(credential, StatusPurpose.Revocation);
  const hasSuspensionStatus = hasStatusPurpose(credential, StatusPurpose.Suspension);

  if (verifyPayload.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerText}>Verification error:</Text>
        <Text style={styles.bodyText}>
          {verifyPayload.error}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.headerText}>Issuer</Text>
        <StatusItem
          positiveText="Is verified in:"
          negativeText="Is not verified in a registered institution"
          verified={details[LogId.IssuerDIDResolves]}
        >
          {registryNames && <BulletList items={registryNames} />}
        </StatusItem>
      </View>
      <View style={styles.container}>
        <Text style={styles.headerText}>Credential</Text>
        <StatusItem
          positiveText="Has a valid digital signature"
          negativeText="Has an invalid digital signature"
          verified={details[LogId.ValidSignature]}
        />
        <StatusItem
          positiveText={`Has not expired ${expirationText}`}
          negativeText={`Has expired ${expirationText}`}
          verified={details[LogId.Expiration]}
        />
        {hasCredentialStatus && hasRevocationStatus &&
        <StatusItem
          positiveText="Has not been revoked by issuer"
          negativeText="Has been revoked by issuer"
          verified={
            details[LogId.RevocationStatus] === undefined ||
            details[LogId.RevocationStatus]
          }
        />}
        {hasCredentialStatus && hasSuspensionStatus &&
        <StatusItem
          positiveText="Has not been suspended by issuer"
          negativeText="Has been suspended by issuer"
          verified={
            details[LogId.SuspensionStatus] === undefined ||
            details[LogId.SuspensionStatus]
          }
        />}
      </View>
    </>
  );
}

function StatusItem({ positiveText, negativeText, verified = true, children }: StatusItemProps) {
  const { theme, styles } = useDynamicStyles(dynamicStyleSheet);

  return (
    <View style={styles.statusItem}>
      <MaterialIcons
        name={verified ? 'check' : 'close'}
        size={theme.iconSize}
        color={verified ? theme.color.success : theme.color.error}
        accessibilityLabel={verified ?  'Verified, Icon' : 'Not Verified, Icon'}
      />
      <View style={styles.statusItemContent}>
        <Text style={styles.statusItemLabel}>{verified ? positiveText : negativeText}</Text>
        {verified && <View>{children}</View>}
      </View>
    </View>
  );
}
