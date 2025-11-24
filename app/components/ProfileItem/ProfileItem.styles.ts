import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    backgroundColor: theme.color.foregroundPrimary,
    borderRadius: theme.borderRadius,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  textContainer: {
    flex: 1
  },
  titleText: {
    color: theme.color.textPrimary,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.regular,
    marginBottom: 6
  },
  subtitleText: {
    color: theme.color.textPrimary,
    fontFamily: theme.fontFamily.regular,
    fontSize: 14
  },
  input: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary
  },
  underline: {
    textDecorationLine: 'underline'
  },
  checkboxButtonContainer: {
    flexDirection: 'row',
    padding: 8,
    justifyContent: 'center'
  },
  checkboxContainer: {
    height: 24,
    width: 24,
    marginRight: 16
  },
  checkboxText: {
    ...mixins.paragraphText
  },
  passwordForm: {
    marginVertical: 8
  }
}))
