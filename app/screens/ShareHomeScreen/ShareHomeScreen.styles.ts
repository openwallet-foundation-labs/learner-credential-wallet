import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    flex: 1
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  credentialList: {
    borderRadius: theme.borderRadius,
    overflow: 'hidden'
  },
  paragraph: {
    fontSize: 14,
    color: theme.color.textPrimary,
    marginTop: 8
  },
  sendButton: {
    marginTop: 32
  }
}))
