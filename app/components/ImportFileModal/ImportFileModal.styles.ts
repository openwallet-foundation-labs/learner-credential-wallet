import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  underline: {
    textDecorationLine: 'underline'
  },
  password: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary
  }
}))
