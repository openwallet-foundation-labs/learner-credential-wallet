import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16
  },
  paragraph: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.medium,
    marginVertical: 8
  },
  underline: {
    textDecorationLine: 'underline'
  },
  header: {
    marginVertical: 8,
    ...mixins.headerText
  },
  spacer: {
    height: 24
  }
}))
