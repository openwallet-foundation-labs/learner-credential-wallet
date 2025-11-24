import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  menuContainer: {
    top: 0,
    right: -10,
    width: 180,
    borderRadius: 3,
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 1
  },
  container: {
    padding: 16
  },
  header: {
    ...mixins.headerText,
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.header,
    lineHeight: 30,
    marginVertical: 8
  },
  link: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.textPrimary,
    textDecorationLine: 'underline'
  },
  scrollContainer: {
    flexGrow: 1
  },
  outerContainer: {
    flex: 1
  },
  profileContainer: {
    marginVertical: 16
  },
  textBold: {
    fontFamily: theme.fontFamily.medium
  }
}))
