import React, { PropsWithChildren, forwardRef, Ref } from 'react'
import { TouchableWithoutFeedback, View, ViewProps } from 'react-native'

export type AccessibleViewProps = PropsWithChildren<
  ViewProps & {
    label: string
    onPress?: () => void
    innerViewProps?: ViewProps
  }
>

/**
 * A component that wraps child elements into a single accessible element
 * with the provided `label` prop. Additional props will be passed to both
 * containing views.
 */
function AccessibleView(
  { label, onPress, children, ...rest }: AccessibleViewProps,
  ref: Ref<View>
): React.ReactElement {
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View accessibilityLabel={label} accessible={true} ref={ref} {...rest}>
        <View
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
          {...rest}
        >
          {children}
        </View>
      </View>
    </TouchableWithoutFeedback>
  )
}

export default forwardRef<View, AccessibleViewProps>(AccessibleView)
