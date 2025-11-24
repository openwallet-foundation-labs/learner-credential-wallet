import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'

import { AddScreen } from '../../screens'
import { useResetNavigationOnBlur } from '../../hooks'
import type { AddNavigationProps, AddNavigationParamList } from '..'

const Stack = createStackNavigator<AddNavigationParamList>()

export default function AddNavigation({
  navigation
}: AddNavigationProps): React.ReactElement {
  useResetNavigationOnBlur(navigation)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddScreen" component={AddScreen} />
    </Stack.Navigator>
  )
}
