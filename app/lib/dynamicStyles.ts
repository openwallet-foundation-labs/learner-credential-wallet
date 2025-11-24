import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native'
import { Mixins, ThemeType } from '../styles'

type StyleObject = ViewStyle | TextStyle | ImageStyle

export type DynamicStyles = {
  theme: ThemeType
  mixins: Mixins
}

export type DynamicStyleSheet<T> = (dynamicStyles: DynamicStyles) => T

type StyleObjectsResolver = (
  dynamicStyles: DynamicStyles
) => Record<string, StyleObject>

export function createDynamicStyleSheet<
  R extends StyleObjectsResolver,
  S extends ReturnType<R>
>(styleObjectsResolver: R): DynamicStyleSheet<S> {
  return (dynamicStyles: DynamicStyles) => {
    const styleObjects = styleObjectsResolver(dynamicStyles)
    return StyleSheet.create(styleObjects as any) as S
  }
}
