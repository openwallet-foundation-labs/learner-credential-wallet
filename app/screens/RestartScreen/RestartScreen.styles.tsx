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
    textAlign: 'center',
    color: theme.color.textPrimary,
    padding: 16
  },
  paragraph: {
    ...mixins.paragraphText,
    textAlign: 'center',
    marginBottom: 48
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
  }
}))
