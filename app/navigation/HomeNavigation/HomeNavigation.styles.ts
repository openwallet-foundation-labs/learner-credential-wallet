import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  barStyle: {
    backgroundColor: theme.color.backgroundSecondary,
    borderTopWidth: 0
  }
}))
