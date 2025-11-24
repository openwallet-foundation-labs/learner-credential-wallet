import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16,
    flex: 1
  },
  paragraph: {
    ...mixins.paragraphText,
    marginBottom: 16,
    marginTop: 8
  },
  underline: {
    textDecorationLine: 'underline'
  },
  password: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary
  }
}))
