import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    flex: 1,
    padding: 16
  },
  paragraph: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.medium,
    marginVertical: 8
  },
  underline: {
    textDecorationLine: 'underline'
  }
}))
