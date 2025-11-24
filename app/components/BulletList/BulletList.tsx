import React from 'react'
import { Text, View } from 'react-native'

import { useDynamicStyles } from '../../hooks'
import dynamicStyleSheet from './BulletList.style'
import { BulletListProps } from './BulletList.d'

export default function BulletList({
  items,
  style
}: BulletListProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)

  return (
    <View style={style}>
      {items.map((item, i) => (
        <Text key={`${i}-${item}`} style={styles.bulletItem}>
          ● {item}
        </Text>
      ))}
    </View>
  )
}
