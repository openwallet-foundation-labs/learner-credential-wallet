import React from 'react'
import { View, Text, Image } from 'react-native'

import { useDynamicStyles } from '../../hooks'
import { CredentialCardProps, CredentialDisplayConfig } from '.'
import {
  credentialSubjectRenderInfoFrom,
  dynamicStyleSheet,
  getSubject,
  issuerRenderInfoFrom
} from './shared'
import { getCredentialName } from '../credentialName'

export const studentIdDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'StudentId',
  cardComponent: StudentIdCard,
  itemPropsResolver: (credential) => {
    const subject = getSubject(credential)
    const { subjectName } = credentialSubjectRenderInfoFrom(subject)
    const { issuerName, issuerImage } = issuerRenderInfoFrom(credential.issuer)

    return {
      title: `${subjectName} Student ID`,
      subtitle: issuerName,
      image: issuerImage
    }
  }
}

function StudentIdCard({
  rawCredentialRecord
}: CredentialCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { credential } = rawCredentialRecord
  const { credentialSubject } = credential
  const { studentId } = credentialSubject

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dataContainer}>
        <Text style={styles.header} accessibilityRole="header">
          Student ID
        </Text>
      </View>
      <Image source={{ uri: studentId?.image }} style={styles.fullWidthImage} />
    </View>
  )
}
