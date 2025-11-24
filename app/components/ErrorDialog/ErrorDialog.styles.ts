import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  outerContainer: {
    width: '100%'
  },
  container: {
    backgroundColor: theme.color.error,
    borderRadius: theme.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: '100%'
  },
  message: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.regular,
    color: theme.color.backgroundSecondary,
    paddingHorizontal: 8
  }
}))
