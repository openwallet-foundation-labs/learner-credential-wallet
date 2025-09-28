import React from 'react';
import { View, Text, Linking } from 'react-native';
import { useDynamicStyles } from '../../../../hooks';
import { getValidAlignments, ValidAlignment } from '../utils/alignment';
import { createDynamicStyleSheet } from '../../../dynamicStyles';
import { IAlignment } from '@digitalcredentials/ssi';

type AlignmentsListProps = {
  alignment?: IAlignment[];
  disabled?: boolean;
};

const AlignmentItem = ({ alignment, disabled }: { alignment: ValidAlignment, disabled: boolean }) => {
  const { styles } = useDynamicStyles(alignmentStyleSheet);

  return (
    <View style={styles.alignmentItem}>
      <Text style={styles.alignmentText}>
        {alignment.targetName}
      </Text>
      {alignment.targetUrl && (
        alignment.isValidUrl && !disabled ? (
          <Text
            style={styles.alignmentLink}
            accessibilityRole="link"
            onPress={() => Linking.openURL(alignment.targetUrl!)}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {alignment.targetUrl}
          </Text>
        ) : (
          <Text
            style={styles.alignmentUrl}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {alignment.targetUrl}
          </Text>
        )
      )}
      {alignment.targetDescription && (
        <Text style={styles.alignmentDescription}>
          {alignment.targetDescription}
        </Text>
      )}
    </View>
  );
};

export default function AlignmentsList({ alignment, disabled = false }: AlignmentsListProps): React.ReactElement | null {
  const { styles } = useDynamicStyles(alignmentStyleSheet);
  const validAlignments = getValidAlignments(alignment);

  if (validAlignments.length === 0) {
    return null;
  }

  return (
    <View style={styles.alignmentsContainer}>
      <Text style={styles.alignmentsHeader}>Alignments</Text>
      {validAlignments.map((alignment, index) => (
        <AlignmentItem key={index} alignment={alignment} disabled={disabled} />
      ))}
    </View>
  );
}

const alignmentStyleSheet = createDynamicStyleSheet(({ theme }) => ({
  alignmentsContainer: {
    flexGrow: 1,
    marginVertical: 12,
  },
  alignmentsHeader: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.bold,
    color: theme.color.textPrimary,
    marginBottom: 8,
  },
  alignmentItem: {
    marginBottom: 22,
  },
  alignmentLink: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.linkColor,
    textDecorationLine: 'underline',
    marginBottom: 4,
    marginTop: 4,
  },
  alignmentUrl: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.textSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  alignmentText: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.textPrimary,
  },
  alignmentDescription: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.textPrimary,
    marginTop: 4,
  },
}));
