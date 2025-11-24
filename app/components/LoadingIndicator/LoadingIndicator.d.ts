export type LoadingIndicatorProps = {
  loading: boolean
}

export type AnimatedPathComponent = FunctionComponent<{
  stroke: string
  strokeWidth: number
  strokeLinecap: string
  strokeLinejoin: string
  scale: string
  strokeDashoffset: Animated.AnimatedInterpolation
  strokeDasharray: string
  d: string
}>
