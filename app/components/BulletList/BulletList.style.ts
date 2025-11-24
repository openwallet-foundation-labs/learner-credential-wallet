import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  bulletItem: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.regular,
    marginBottom: -2
  }
}))
