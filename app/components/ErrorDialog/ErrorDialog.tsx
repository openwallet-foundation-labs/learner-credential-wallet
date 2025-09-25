import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import dynamicStyleSheet from './ErrorDialog.styles';
import AccessibleView from '../AccessibleView/AccessibleView';
import { useAccessibilityFocus, useDynamicStyles } from '../../hooks';

export type ErrorDialogProps = {
  message: string;
}

export default function ErrorDialog({ message }: ErrorDialogProps): React.ReactElement | null {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet);
  const [containerRef, focusContainer] = useAccessibilityFocus<View>();

  useEffect(focusContainer, [message]);

  if (message !== '') {
    return (
      <AccessibleView style={styles.outerContainer} label={`Error: ${message}`} ref={containerRef}>
        <View style={styles.container}>
          <Ionicons name="warning" size={theme.iconSize} color={theme.color.backgroundSecondary} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </AccessibleView>
    );
  } else {
    return null;
  }
}
