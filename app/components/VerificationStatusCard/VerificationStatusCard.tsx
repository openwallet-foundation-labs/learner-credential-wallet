//import React, { useContext } from 'react';
import React from 'react'
import { View, Text } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import moment from 'moment'

import { VerificationStatusCardProps } from './VerificationStatusCard.d'
import dynamicStyleSheet from './VerificationStatusCard.styles'
import { useDynamicStyles } from '../../hooks'
//import { DidRegistryContext } from '../../init/registries';
//import { issuerInRegistries } from '../../lib/issuerInRegistries';
import { getExpirationDate } from '../../lib/credentialValidityPeriod'

enum LogId {
  ValidSignature = 'valid_signature',
  Expiration = 'expiration',
  IssuerDIDResolves = 'registered_issuer',
  RevocationStatus = 'revocation_status',
  SuspensionStatus = 'suspension_status',
  SupportedFormat = 'supported_format'
}

export default function VerificationStatusCard({
  credential,
  verifyPayload
}: VerificationStatusCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const expirationDate = getExpirationDate(credential)
  const hasExpirationDate = expirationDate !== undefined
  const supportedCredentialTypes = [
    'VerifiableCredential',
    'OpenBadgeCredential'
  ]
  const hasKnownType =
    Array.isArray(credential.type) &&
    credential.type.some((t: string) => supportedCredentialTypes.includes(t))

  const details =
    verifyPayload.result.log?.reduce<Record<string, boolean>>((acc, log) => {
      acc[log.id] = log.valid
      return acc
    }, {}) || {}

  const lastChecked = moment(verifyPayload.result.timestamp).format(
    'MMM D, YYYY h:mmA z'
  )

  if (verifyPayload.loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          Credential Verification and Validation
        </Text>
        <Text style={styles.bodyText}>Verifying credential...</Text>
      </View>
    )
  }

  if (verifyPayload.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          Credential Verification and Validation
        </Text>
        <Text style={styles.bodyText}>Error: {verifyPayload.error}</Text>
      </View>
    )
  }

  function getStatusProps(
    id: LogId,
    valid: boolean | undefined
  ): { message: string; status: 'positive' | 'warning' | 'negative' } {
    switch (id) {
      case LogId.ValidSignature:
        return {
          message: valid ? 'has a valid signature' : 'has an invalid signature',
          status: valid ? 'positive' : 'negative'
        }
      case LogId.IssuerDIDResolves:
        return {
          message: valid
            ? 'has been issued by a known issuer'
            : "isn't in a known issuer registry",
          status: valid ? 'positive' : 'warning'
        }
      case LogId.RevocationStatus:
        return {
          message: valid ? 'has not been revoked' : 'has been revoked',
          status: valid ? 'positive' : 'negative'
        }
      case LogId.SuspensionStatus:
        return {
          message: valid ? 'has not been suspended' : 'has been suspended',
          status: valid ? 'positive' : 'negative'
        }
      case LogId.Expiration:
        return {
          message: valid ? 'has not expired' : 'has expired',
          status: valid ? 'positive' : 'warning'
        }
      case LogId.SupportedFormat:
        return {
          message: valid
            ? 'is in a supported credential format'
            : 'is not a recognized credential type',
          status: valid ? 'positive' : 'negative'
        }
      default:
        return {
          message: 'Status unknown',
          status: 'warning'
        }
    }
  }

  function StatusRow({
    message,
    status
  }: {
    message: string
    status: 'positive' | 'warning' | 'negative'
  }) {
    const { styles } = useDynamicStyles(dynamicStyleSheet)

    const getIcon = () => {
      switch (status) {
        case 'positive':
          return (
            <MaterialIcons
              name="check-circle"
              size={20}
              color="green"
              style={styles.statusIcon}
            />
          )
        case 'negative':
          return (
            <MaterialIcons
              name="cancel"
              size={20}
              color="red"
              style={styles.statusIcon}
            />
          )
        case 'warning':
          return (
            <View style={styles.warningCircle}>
              <Text style={styles.warningText}>!</Text>
            </View>
          )
        default:
          return null
      }
    }

    return (
      <View style={styles.statusRow}>
        {getIcon()}
        <Text style={styles.statusText}>{message}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Credential Verification and Validation
      </Text>
      <Text style={styles.subTitle}>This credential:</Text>
      <StatusRow {...getStatusProps(LogId.SupportedFormat, hasKnownType)} />
      <StatusRow
        {...getStatusProps(LogId.ValidSignature, details[LogId.ValidSignature])}
      />
      <StatusRow
        {...getStatusProps(
          LogId.IssuerDIDResolves,
          details[LogId.IssuerDIDResolves]
        )}
      />
      <StatusRow
        {...getStatusProps(
          LogId.RevocationStatus,
          details[LogId.RevocationStatus] ?? true
        )}
      />
      {/* <StatusRow {...getStatusProps(LogId.SuspensionStatus, details[LogId.SuspensionStatus])} /> */}
      {hasExpirationDate ? (
        <StatusRow
          {...getStatusProps(LogId.Expiration, details[LogId.Expiration])}
        />
      ) : (
        <StatusRow message="has no expiration date set" status="positive" />
      )}

      <Text style={styles.lastChecked}>Last Checked: {lastChecked}</Text>
    </View>
  )
}
