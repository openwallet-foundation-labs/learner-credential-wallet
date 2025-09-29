import { StyleSheet, ViewStyle } from 'react-native';
import defaultTheme, { ThemeType } from './theme';

const mixins = (theme: ThemeType) => {
  const sharedMixins = StyleSheet.create({
    shadow: {
      overflow: 'visible' as ViewStyle['overflow'],
      elevation: 5,
      shadowColor: theme.color.shadow,
      shadowOpacity: theme.shadowOpacity,
      shadowRadius: 15,
      shadowOffset: {
        height: 5,
        width: 0,
      },
      backgroundColor: theme.color.backgroundPrimary,
    },
    paragraphText: {
      fontFamily: theme.fontFamily.regular,
      fontSize: theme.fontSize.regular,
      color: theme.color.textSecondary,
      lineHeight: 24,
    },
  });

  return StyleSheet.create({
    /* Shared mixins */
    ...sharedMixins,

    bodyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.color.backgroundPrimary,
    },

    /* Header mixins */
    headerContainer: {
      backgroundColor: theme.color.backgroundSecondary,
      borderBottomWidth: 0,
      zIndex: 1,
    },
    headerTitle: {
      color: theme.color.textPrimary,
      fontFamily: theme.fontFamily.bold,
      fontSize: theme.fontSize.regular,
    },
    headerIcon: {
      color: theme.color.textPrimary,
      fontSize: theme.iconSize,
      padding: 4,
    },
    headerComponentContainer: {
      justifyContent: 'center',
    },

    /* Typographic mixins */
    headerText: {
      fontFamily: theme.fontFamily.bold,
      color: theme.color.textHeader,
      fontSize: theme.fontSize.medium,
    },
    boldText: {
      fontFamily: theme.fontFamily.bold,
    },

    /* Button mixins */
    button: {
      backgroundColor: theme.color.iconActive,
      borderRadius: theme.borderRadius,
      paddingVertical: 12,
      paddingHorizontal: 18,
      minHeight: 48,
    },
    buttonPrimary: {
      backgroundColor: theme.color.buttonPrimary,
      padding: 16,
      borderRadius: theme.borderRadius,
    },
    buttonSecondary: {
      backgroundColor: theme.color.foregroundPrimary,
      padding: 16,
      borderRadius: theme.borderRadius,
    },
    buttonError: {
      backgroundColor: theme.color.error,
      padding: 16,
      borderRadius: theme.borderRadius,
    },
    buttonContainer: {
      ...sharedMixins.shadow,
      flex: 1,
    },
    buttonGroup: {
      flexDirection: 'row',
    },
    buttonSeparator: {
      width: 16,
    },
    buttonTitle: {
      fontFamily: theme.fontFamily.medium,
      fontSize: theme.fontSize.regular,
      color: theme.color.backgroundSecondary,
    },
    buttonTitleSecondary: {
      fontFamily: theme.fontFamily.medium,
      fontSize: theme.fontSize.regular,
      color: theme.color.textPrimary,
    },
    buttonIcon: {
      justifyContent: 'space-between',
      backgroundColor: theme.color.foregroundPrimary,
      borderRadius: theme.borderRadius,
      paddingVertical: 12,
      paddingHorizontal: 18,
      minHeight: 48,
    },
    buttonIconContainer: {
      ...sharedMixins.shadow,
      marginVertical: 8,
      flex: 1,
    },
    buttonContainerVertical: {
      ...sharedMixins.shadow,
      marginVertical: 8,
    },
    buttonIconTitle: {
      fontFamily: theme.fontFamily.medium,
      fontSize: theme.fontSize.regular,
      color: theme.color.textPrimary,
    },
    buttonClear: {
      padding: 16,
      borderRadius: theme.borderRadius,
      backgroundColor: theme.color.transparent,
    },
    buttonClearContainer: {
      width: '100%',
    },
    buttonClearTitle: {
      fontSize: theme.fontSize.regular,
      color: theme.color.textSecondary,
      fontFamily: theme.fontFamily.regular,
    },
    buttonDisabled: {
      backgroundColor: theme.color.buttonDisabled,
    },

    /* Input mixins */
    input: {
      fontSize: theme.fontSize.regular,
      backgroundColor: theme.color.backgroundPrimary,
      height: 48,
    },

    /* Credential list mixins */
    credentialListContainer: {
      padding: 16,
    },

    flex: {
      flex: 1,
    },

    noFlex: {
      flex: 0,
    },

    modalBodyText: {
      ...sharedMixins.paragraphText,
      textAlign: 'center',
      lineHeight: 24,
      marginVertical: 8,
    },
    modalLinkText: {
      color: theme.color.brightAccent,
      textDecorationLine: 'underline',
    },

    /* Checkbox mixins */
    checkboxContainer: {
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 12,

      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 5,

      width: theme.issuerIconSize,
      height: theme.issuerIconSize,

      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxText: {
      margin: 0,
    },
  });
};

export const dynamicMixins = (theme: ThemeType): ReturnType<typeof mixins> => mixins(theme);
export type Mixins = ReturnType<typeof mixins>;

/* Temporary static definition */
export default dynamicMixins(defaultTheme);
