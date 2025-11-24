import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ mixins }) => ({
  container: {
    padding: 16,
    flex: 1
  },
  credentialList: {
    flex: 1
  },
  paragraph: {
    ...mixins.paragraphText,
    marginBottom: 24,
    marginTop: 8
  }
}))
