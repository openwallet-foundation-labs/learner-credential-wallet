import React from 'react';
import { Linking, Text } from 'react-native';
import { useDynamicStyles } from '../../../../hooks';
import { createDynamicStyleSheet } from '../../../dynamicStyles';

type CardLinkProps = {
  url: string | null,
  disabled?: boolean,
}

export default function CardLink({ url, disabled = false }: CardLinkProps): React.ReactElement | null {
  const { styles } = useDynamicStyles(dynamicStyleSheet);

  if (!url) return null;

  return (
    <Text
      style={disabled ? styles.disabledLink : styles.link}
      accessibilityRole={disabled ? undefined : "link"}
      onPress={disabled ? undefined : () => Linking.openURL(url)}
    >
      {url}
    </Text>
  );
}

const dynamicStyleSheet = createDynamicStyleSheet(({ theme }) => ({
  link: {
    fontFamily: theme.fontFamily.regular,
    color: theme.color.linkColor,
    textDecorationLine: 'underline',
  },
  disabledLink: {
    fontFamily: theme.fontFamily.regular,
    color: theme.color.textSecondary,
    textDecorationLine: 'none',
  },
}));
