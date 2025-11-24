import type { StackScreenProps } from '@react-navigation/stack'

export type AddNavigationParamList = {
  AddScreen: undefined
}

export type AddScreenProps = StackScreenProps<
  AddNavigationParamList,
  'AddScreen'
>
