import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  dropDownPicker: {
    backgroundColor: theme.color.backgroundPrimary,
    borderColor: theme.color.iconInactive,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius
  },
  dropDownPickerDrawer: {
    backgroundColor: theme.color.backgroundPrimary,
    borderColor: theme.color.iconInactive,
    borderRadius: theme.borderRadius
  },
  dropDownPickerText: {
    ...mixins.paragraphText
  },
  headerComponentContainer: {
    zIndex: 2,
    marginBottom: 8
  },
  dropDownLabel: {
    color: theme.color.textPrimary,
    backgroundColor: theme.color.backgroundPrimary,
    fontSize: theme.fontSize.small,
    marginLeft: 14,
    marginBottom: -10,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    zIndex: 2
  },
  dropDownItem: {
    paddingHorizontal: 20,
    height: 48,
    backgroundColor: theme.color.foregroundPrimary
  },
  dropDownItemSelected: {
    backgroundColor: theme.color.backgroundPrimary
  }
}))
