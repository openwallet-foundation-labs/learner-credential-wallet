import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.color.backgroundPrimary
  },
  image: {
    height: 72,
    resizeMode: 'contain'
  },
  title: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.title,
    color: theme.color.textPrimary,
    padding: 16,
    textAlign: 'center'
  },
  paragraph: {
    ...mixins.paragraphText,
    textAlign: 'center',
    marginBottom: 48
  },
  passwordEntry: {
    ...mixins.input,
    width: '100%',
    marginBottom: 6
  },
  passwordError: {
    borderColor: theme.color.error
  },
  buttonPrimary: {
    backgroundColor: theme.color.buttonPrimary,
    padding: 16,
    borderRadius: theme.borderRadius
  },
  buttonPrimaryTitle: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.regular,
    color: theme.color.backgroundSecondary
  },
  buttonPrimaryContainer: {
    width: '100%',
    marginTop: 20
  },
  buttonClear: {
    ...mixins.button,
    backgroundColor: theme.color.transparent,
    marginVertical: 8
  },
  buttonClearContainer: {
    width: '100%'
  },
  buttonClearTitle: {
    ...mixins.buttonTitle,
    marginLeft: 12,
    color: theme.color.textSecondary,
    fontFamily: theme.fontFamily.regular,
    textDecorationLine: 'underline'
  }
}))
