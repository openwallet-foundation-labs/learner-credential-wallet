import React from 'react'

import { createStackNavigator } from '@react-navigation/stack'

import {
  HomeScreen,
  CredentialScreen,
  PublicLinkScreen,
  IssuerInfoScreen
} from '../../screens'
import { CredentialNavigationProps, CredentialNavigationParamList } from '../'
import { useResetNavigationOnBlur } from '../../hooks'

const Stack = createStackNavigator<CredentialNavigationParamList>()

export default function CredentialNavigation({
  navigation
}: CredentialNavigationProps): React.ReactElement {
  useResetNavigationOnBlur(navigation)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="CredentialScreen" component={CredentialScreen} />
      <Stack.Screen name="PublicLinkScreen" component={PublicLinkScreen} />
      <Stack.Screen name="IssuerInfoScreen" component={IssuerInfoScreen} />
    </Stack.Navigator>
  )
}
