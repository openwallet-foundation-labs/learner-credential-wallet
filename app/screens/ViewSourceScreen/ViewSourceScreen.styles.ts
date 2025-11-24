import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16,
    flex: 1
  },
  scrollView: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.color.iconInactive,
    backgroundColor: theme.color.backgroundSecondary
  },
  scrollViewInner: {
    flexGrow: 1
  },
  scrollViewHorizontalInner: {
    padding: 16,
    flex: 1
  },
  noWrap: {
    flexGrow: 1
  },
  codeBlock: {
    flex: 1,
    color: theme.color.textPrimary,
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.small,
    maxWidth: 20000
  },
  bottomButton: {
    ...mixins.buttonPrimary,
    marginTop: 16
  }
}))
