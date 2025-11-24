import React, { useEffect, useState } from 'react'
import { View, Animated, Easing } from 'react-native'
import { Svg, Path } from 'react-native-svg'
import { AnimatedCircularProgress } from 'react-native-circular-progress'

import { useAnimation, useDynamicStyles } from '../../hooks'
import dynamicStyleSheet from './LoadingIndicator.styles'
import type { LoadingIndicatorProps } from './LoadingIndicator.d'
import AccessibleView from '../AccessibleView/AccessibleView'

/**
 * react-native-svg has a typescript error where the Path props type is not
 * recognized when it becomes an animated component.
 */
const AnimatedPath = Animated.createAnimatedComponent(Path)

export default function LoadingIndicator({
  loading
}: LoadingIndicatorProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)
  const [percent, setPercent] = useState(25)

  const rotate = useAnimation(['0deg', '360deg'], { duration: 1000 })
  const path = useAnimation([35, 0], {
    duration: 300,
    easing: Easing.in(Easing.ease)
  })

  useEffect(() => {
    if (loading) {
      setPercent(25)
      rotate.reset()
      path.reset()
      Animated.loop(rotate).start()
    } else {
      setPercent(100)
      rotate.stop()
      path.start()
    }

    return () => {
      rotate.stop()
      path.stop()
    }
  }, [loading])

  return (
    <AccessibleView
      label={`LoadingIndicator, ${loading ? 'Loading' : 'Complete'}`}
    >
      <Animated.View style={{ transform: [{ rotate: rotate.value }] }}>
        <AnimatedCircularProgress
          size={100}
          width={4}
          fill={percent}
          tintColor={loading ? theme.color.textHeader : theme.color.success}
          backgroundColor={theme.color.backgroundSecondary}
          lineCap="round"
        />
      </Animated.View>
      <View style={styles.checkmarkContainer}>
        <Svg width="52" height="40">
          <AnimatedPath
            fill="none"
            stroke={theme.color.success}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            scale="2"
            strokeDashoffset={path.value}
            strokeDasharray="35"
            d="M1 11.2l7.1 7.2 16.7-16.8"
          />
        </Svg>
      </View>
    </AccessibleView>
  )
}
