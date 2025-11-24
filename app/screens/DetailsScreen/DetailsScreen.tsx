import React from 'react'
import { View, Text } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { BulletList, NavHeader } from '../../components'

import dynamicStyleSheet from './DetailsScreen.styles'
import { DetailsScreenProps } from './DetailsScreen.d'
import { useDynamicStyles } from '../../hooks'

export default function DetailsScreen({
  navigation,
  route
}: DetailsScreenProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { header, details, goBack = navigation.goBack } = route.params

  return (
    <>
      <NavHeader goBack={goBack} title={header} />
      <ScrollView style={styles.bodyContainer}>
        {Object.entries(details).map(([sectionTitle, items]) => (
          <View style={styles.sectionContainer} key={sectionTitle}>
            <Text style={styles.header}>{sectionTitle}</Text>
            <BulletList items={items} />
          </View>
        ))}
      </ScrollView>
    </>
  )
}
