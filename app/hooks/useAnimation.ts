import { useRef } from 'react'
import { Animated, Easing } from 'react-native'

type InterpolateRange = [number, number] | [string, string]
type UseAnimationType = Animated.CompositeAnimation & {
  readonly value: Animated.AnimatedInterpolation<number | string>
}

export function useAnimation(
  range: InterpolateRange = [0, 1],
  config: Partial<Animated.TimingAnimationConfig> = {}
): UseAnimationType {
  const animationValue = useRef(new Animated.Value(0)).current
  const animation = useRef(
    Animated.timing(animationValue, {
      toValue: 1,
      useNativeDriver: true,
      easing: Easing.linear,
      ...config
    })
  ).current

  /* This method replaces the Animated library
   * reset() method that doesn't work.
   */
  const reset = () => animationValue.setValue(0)

  const value = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: range
  })

  return { ...animation, reset, value }
}
