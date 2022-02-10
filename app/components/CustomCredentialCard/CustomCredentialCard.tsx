import React from 'react';
import { View, Text } from 'react-native';
import type { CredentialRecordRaw } from '../../model/credential';
import styles from './CustomCredentialCard.styles';

type CredentialCardProps = {
  rawCredentialRecord: CredentialRecordRaw;
};


export default function CustomCredentialCard ({ rawCredentialRecord }: CredentialCardProps): JSX.Element {
  return (
    <View style={styles.credentialContainer}>
      <View style={styles.dataContainer}>
        <Text style={styles.header} accessibilityRole="header">Yeah</Text>
      </View>
    </View>
  );
}


