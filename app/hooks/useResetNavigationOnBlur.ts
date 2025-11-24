import { useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'

type GenericNavigation = {
  setParams: (params: Record<string, unknown>) => void
}

/**
 * Hook for reseting navigational params on screen blur. Should be used in
 * nested navigators that are being navigated to with a `screen` or `params`
 * param.
 *
 * Adapted from:
 * https://github.com/react-navigation/react-navigation/issues/6915#issuecomment-591533068
 */
export function useResetNavigationOnBlur<Navigation extends GenericNavigation>(
  navigation: Navigation
): void {
  useFocusEffect(
    useCallback(() => {
      return () =>
        navigation.setParams({ screen: undefined, params: undefined })
    }, [navigation])
  )
}
