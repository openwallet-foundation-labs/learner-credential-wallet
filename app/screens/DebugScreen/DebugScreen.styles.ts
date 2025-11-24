import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16
  },
  paragraph: {
    ...mixins.paragraphText
  },
  codeBlock: {
    color: theme.color.textPrimary,
    backgroundColor: theme.color.backgroundSecondary,
    padding: 10,
    fontFamily: theme.fontFamily.mono,
    marginBottom: 16
  },
  exitButton: {
    backgroundColor: theme.color.transparent,
    padding: 0
  },
  exitButtonTitle: {
    color: theme.color.textHeader
  }
}))
