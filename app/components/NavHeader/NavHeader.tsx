import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from 'react-native-elements';

import { useAccessibilityFocus, useDynamicStyles } from '../../hooks';
import type { NavHeaderProps } from './NavHeader.d';
import AccessibleView from '../AccessibleView/AccessibleView';

export default function NavHeader({
  title,
  goBack,
  ...headerProps
}: NavHeaderProps): React.ReactElement {
  const { mixins } = useDynamicStyles();
  const [headerRef, focusHeader] = useAccessibilityFocus<Text>();

  useEffect(focusHeader, []);

  const leftComponent = goBack ? (
    <AccessibleView
      label="Back"
      accessibilityRole="button"
      onPress={goBack}
    >
      <MaterialIcons
        name="arrow-back"
        style={mixins.headerIcon}
      />
    </AccessibleView>
  ) : undefined;

  const centerComponent = (
    <Text
      style={mixins.headerTitle}
      accessibilityLabel={`${title} Screen`}
      ref={headerRef}
    >
      {title}
    </Text>
  );

  return (
    <Header
      leftContainerStyle={mixins.headerComponentContainer}
      centerContainerStyle={mixins.headerComponentContainer}
      rightContainerStyle={mixins.headerComponentContainer}
      containerStyle={mixins.headerContainer}
      leftComponent={leftComponent}
      centerComponent={centerComponent}
      {...headerProps}
    />
  );
}
