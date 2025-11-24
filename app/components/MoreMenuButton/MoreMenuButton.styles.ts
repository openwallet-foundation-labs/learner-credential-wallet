import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  buttonContainer: {
    padding: 2,
    borderRadius: theme.borderRadius
  },
  buttonContainerActive: {
    backgroundColor: theme.color.backgroundPrimary
  },
  menuWrapper: {
    // Wrapper for button positioning
  },
  menuContainerPortal: {
    width: 140,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
    backgroundColor: theme.color.foregroundPrimary,
    position: 'absolute'
  },
  modalBackdrop: {
    flex: 1
  }
}))
