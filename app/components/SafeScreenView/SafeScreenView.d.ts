import React from 'react'
import { NativeSafeAreaViewProps } from 'react-native-safe-area-context'

export type SafeScreenViewProps = NativeSafeAreaViewProps & {
  children: React.ReactNode
}
