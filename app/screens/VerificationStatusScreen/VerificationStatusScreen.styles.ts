import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    padding: 16
  },
  footerText: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.small,
    color: theme.color.textSecondary,
    lineHeight: 18,
    marginTop: 16
  }
}))
