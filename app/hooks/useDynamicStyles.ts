import { DynamicStyleSheet } from '../lib/dynamicStyles'
import { ThemeType, dynamicMixins, Mixins } from '../styles'
import { useThemeContext } from './useThemeContext'

type UseDynamicStylesPayload<T extends DynamicStyleSheet<unknown>> = {
  styles: ReturnType<T>
  theme: ThemeType
  mixins: Mixins
}

type UseDynamicStylesPayloadGeneric = {
  theme: ThemeType
  mixins: Mixins
}

type InferredDynamicStyleSheet<T extends DynamicStyleSheet<unknown>> =
  DynamicStyleSheet<ReturnType<T>>

export function useDynamicStyles<
  T extends InferredDynamicStyleSheet<T>
>(): UseDynamicStylesPayloadGeneric
export function useDynamicStyles<T extends InferredDynamicStyleSheet<T>>(
  dynamicStyleSheet: T
): UseDynamicStylesPayload<T>
export function useDynamicStyles<T extends InferredDynamicStyleSheet<T>>(
  dynamicStyleSheet?: T
): UseDynamicStylesPayload<T> | UseDynamicStylesPayloadGeneric {
  const { theme } = useThemeContext()
  const mixins = dynamicMixins(theme)
  const styles = dynamicStyleSheet?.({ theme, mixins })

  if (dynamicStyleSheet === undefined) {
    return { theme, mixins }
  }

  return { styles, theme, mixins }
}
