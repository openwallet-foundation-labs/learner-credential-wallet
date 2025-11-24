import { MaterialIcons } from '@expo/vector-icons'
import React from 'react'
import { Text, View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'

import { useDynamicStyles } from '../../../../hooks'
import { createDynamicStyleSheet } from '../../../dynamicStyles'

type IssuerInfoButtonProps = {
  issuerId: string | null
  issuerName: string | null
  onPress: (issuerId: string) => void
}

export default function IssuerInfoButton({
  issuerId,
  issuerName,
  onPress
}: IssuerInfoButtonProps): React.ReactElement | null {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)

  function _onPress() {
    if (issuerId) {
      onPress(issuerId)
    }
  }

  return (
    <TouchableOpacity onPress={_onPress} disabled={!issuerId}>
      <Text style={styles.container}>
        <Text style={styles.issuerValue}>{issuerName}</Text>{' '}
        {issuerId && (
          <View style={styles.infoIcon}>
            <MaterialIcons
              name="info-outline"
              size={19}
              color={theme.color.textPrimary}
              style={styles.infoIcon}
            />
          </View>
        )}
      </Text>
    </TouchableOpacity>
  )
}

const dynamicStyleSheet = createDynamicStyleSheet(({ theme }) => ({
  container: {
    marginBottom: 8,
    lineHeight: 22
  },
  issuerValue: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.textPrimary
  },
  infoIcon: {
    top: 2,
    left: 2
  }
}))
