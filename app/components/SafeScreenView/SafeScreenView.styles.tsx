import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    backgroundColor: theme.color.backgroundPrimary
  },
  contentContainer: {
    flex: 1
  }
}))
