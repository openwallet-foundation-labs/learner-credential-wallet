import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'

import { ShareNavigationParamsList, ShareNavigationProps } from '../'
import {
  ShareHomeScreen,
  PresentationPreviewScreen,
  CredentialScreen,
  PublicLinkScreen
} from '../../screens'
import { useResetNavigationOnBlur } from '../../hooks'

const Stack = createStackNavigator<ShareNavigationParamsList>()

export default function ShareNavigation({
  navigation
}: ShareNavigationProps): React.ReactElement {
  useResetNavigationOnBlur(navigation)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShareHomeScreen" component={ShareHomeScreen} />
      <Stack.Screen
        name="PresentationPreviewScreen"
        component={PresentationPreviewScreen}
      />
      <Stack.Screen
        name="CredentialScreen"
        component={CredentialScreen}
        initialParams={{ noShishKabob: true }}
      />
      <Stack.Screen name="PublicLinkScreen" component={PublicLinkScreen} />
    </Stack.Navigator>
  )
}
