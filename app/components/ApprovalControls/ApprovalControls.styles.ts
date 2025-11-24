import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  credentialStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.backgroundPrimary,
    borderRadius: theme.borderRadius,
    width: '100%',
    height: 40
  },
  statusText: {
    fontFamily: theme.fontFamily.bold,
    fontSize: 14,
    color: theme.color.textPrimary,
    paddingLeft: 8
  },
  statusTextOutside: {
    color: theme.color.textSecondary,
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
    marginTop: 12
  },
  approvalContainer: {
    ...mixins.buttonGroup,
    display: 'flex',
    marginTop: 16
  },
  button: {
    ...mixins.button,
    minHeight: undefined,
    backgroundColor: theme.color.buttonSecondary,
    height: 36,
    paddingVertical: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  buttonPrimary: {
    ...mixins.button,
    ...mixins.buttonPrimary,
    minHeight: undefined,
    height: 36,
    paddingVertical: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  buttonText: {
    color: theme.color.textPrimary,
    fontSize: 14,
    fontFamily: theme.fontFamily.medium
  },
  buttonTextPrimary: {
    color: theme.color.textPrimaryDark,
    fontSize: 14,
    fontFamily: theme.fontFamily.medium
  },
  buttonSpacer: {
    width: 16
  }
}))
