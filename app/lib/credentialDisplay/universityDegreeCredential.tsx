import React from 'react'
import { View, Text } from 'react-native'

import { useDynamicStyles } from '../../hooks'
import { CredentialCardProps, CredentialDisplayConfig } from '.'
import {
  CardDetail,
  credentialSubjectRenderInfoFrom,
  dynamicStyleSheet,
  getSubject,
  issuerRenderInfoFrom
} from './shared'
import { getCredentialName } from '../credentialName'

export const universityDegreeCredentialDisplayConfig: CredentialDisplayConfig =
  {
    credentialType: 'UniversityDegreeCredential',
    cardComponent: UniversityDegreeCredentialCard,
    itemPropsResolver: (credential) => {
      const subject = getSubject(credential)
      const { degreeName } = credentialSubjectRenderInfoFrom(subject)
      const { issuerName, issuerImage } = issuerRenderInfoFrom(
        credential.issuer
      )

      return {
        title: degreeName,
        subtitle: issuerName,
        image: issuerImage
      }
    }
  }

function UniversityDegreeCredentialCard({
  rawCredentialRecord
}: CredentialCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { credential } = rawCredentialRecord
  const { credentialSubject } = credential
  const { degreeName } = credentialSubjectRenderInfoFrom(credentialSubject)

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dataContainer}>
        <Text style={styles.header} accessibilityRole="header">
          University degree
        </Text>
      </View>
      <CardDetail label="Degree Title" value={degreeName} />
    </View>
  )
}
