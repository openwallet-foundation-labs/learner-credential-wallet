import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ mixins }) => ({
  container: {
    padding: 16,
    paddingBottom: 0,
    flex: 1
  },
  credentialList: {
    overflow: 'hidden'
  },
  paragraph: {
    ...mixins.paragraphText,
    marginBottom: 16,
    marginTop: 8
  },
  shareButton: {
    ...mixins.buttonPrimary,
    marginVertical: 16,
    marginHorizontal: 16
  },
  cancelButton: {
    ...mixins.buttonSecondary,
    marginBottom: 20,
    marginHorizontal: 16
  }
}))
