import React from 'react';
import { Text, View } from 'react-native';
import { useDynamicStyles, useThemeContext } from '../../../../hooks';
import dynamicStyleSheet from '../styles';

import Markdown from 'react-native-markdown-display';

type CredentialDetailProps = {
  label: string,
  value: string | null,
  isMarkdown?: boolean,
  inRow?: boolean,
}

export default function CardDetail({ label, value, isMarkdown = false, inRow = false}: CredentialDetailProps): React.ReactElement | null {
  const { styles } = useDynamicStyles(dynamicStyleSheet);
  const { isDarkTheme } = useThemeContext();

  const markdownStyles = {
    paragraph: {
      fontSize: styles.dataValue.fontSize,
      color: styles.dataValue.color,
      flex: 1,
      marginBottom: 0,
      marginTop: 0,
    },
    bullet_list: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    ordered_list: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    heading1: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    heading2: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    heading3: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    heading4: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    heading5: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
    heading6: {
      color: isDarkTheme ? '#ffffff' : '#000000'
    },
  };

  if (value === null) {
    return null;
  }

  return (
    inRow ?
      (<View style={[styles.dataContainer, styles.flexRow]}>
        <Text style={styles.dataLabel}>{`${label} : `}</Text>
        {isMarkdown ?
          <Markdown style={markdownStyles}>{value}</Markdown>
          :
          <Text style={styles.dataLabel}>{value}</Text>
        }
      </View>)
      :
      (<View style={styles.dataContainer}>
        <Text style={styles.dataLabel}>{label}</Text>
        {isMarkdown ?
          <Markdown style={markdownStyles}>{value}</Markdown>
          :
          <Text style={styles.dataValue}>{value}</Text>
        }
      </View>)
  );
}
