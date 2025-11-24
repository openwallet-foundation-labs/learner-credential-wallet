import React from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { SafeAreaView } from 'react-native-safe-area-context'

import dynamicStyleSheet from './SafeScreenView.styles'
import type { SafeScreenViewProps } from './SafeScreenView.d'
import { useDynamicStyles } from '../../hooks'

export default function SafeScreenView({
  children,
  ...rest
}: SafeScreenViewProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.contentContainer}
      style={styles.container}
    >
      <SafeAreaView {...rest}>{children}</SafeAreaView>
    </KeyboardAwareScrollView>
  )
}
