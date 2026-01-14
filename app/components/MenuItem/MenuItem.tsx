import React from 'react'
import { TouchableHighlight, View, Text } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

import dynamicStyleSheet from './MenuItem.styles'
import type { MenuItemProps } from './MenuItem.d'
import { useDynamicStyles } from '../../hooks'

export default function MenuItem({
  icon,
  title,
  onPress,
  testID
}: MenuItemProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)

  return (
    <TouchableHighlight
      style={styles.menuItemContainer}
      underlayColor={theme.color.backgroundSecondary}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={title}
      accessibilityRole="button"
      accessible={true}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon && (
          <MaterialIcons
            name={icon}
            size={theme.iconSize}
            color={theme.color.iconInactive}
          />
        )}
        <View style={{ flex: 1, marginLeft: icon ? 12 : 0 }}>
          <Text style={styles.menuItemTitle}>{title}</Text>
        </View>
      </View>
    </TouchableHighlight>
  )
}
