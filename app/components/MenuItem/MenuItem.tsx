import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import dynamicStyleSheet from './MenuItem.styles';
import type { MenuItemProps } from './MenuItem.d';
import { useDynamicStyles } from '../../hooks';

export default function MenuItem({ icon, title, onPress }: MenuItemProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);

  return (
    <TouchableOpacity
      style={[
        styles.menuItemContainer,
        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 }
      ]}
      onPress={onPress}
    >
      { icon && (
        <MaterialIcons
          name={icon}
          size={theme.iconSize}
          color={theme.color.iconInactive}
        />
      )}
      <View style={{ flex: 1, marginLeft: icon ? 12 : 0 }}>
        <Text style={styles.menuItemTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}
