import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  menuItemTitle: {
    color: theme.color.textPrimary
  },
  menuItemContainer: {
    backgroundColor: theme.color.foregroundPrimary,
    borderBottomColor: theme.color.backgroundPrimary,
    borderBottomWidth: 2,
    padding: 20
  }
}))
