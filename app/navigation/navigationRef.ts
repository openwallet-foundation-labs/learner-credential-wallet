import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootNavigationParamsList } from './RootNavigation/RootNavigation.d'

export const navigationRef =
  createNavigationContainerRef<RootNavigationParamsList>()
