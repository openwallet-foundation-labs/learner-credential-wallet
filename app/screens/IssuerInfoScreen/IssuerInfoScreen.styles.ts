import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme }) => ({
  bodyContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.color.backgroundPrimary,
  },
  dataContainer: {
    flexGrow: 1,
    marginVertical: 12,
  },
  dataLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.bold,
    color: theme.color.textSecondary,
    marginBottom: 8,
  },
  dataValue: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.textSecondary,
    flex: 1,
  },
  link: {
    fontFamily: theme.fontFamily.regular,
    color: theme.color.linkColor,
    textDecorationLine: 'underline',
  },
  bulletList: {
    marginTop: -4,
  },

  // 🔽 Added styles for registry rendering
  sectionTitle: {
    fontSize: theme.fontSize.regular,
    fontFamily: theme.fontFamily.bold,
    color: theme.color.textPrimary,
    marginBottom: 16,
  },
  registryBlock: {
    marginBottom: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.textSecondary,
  },
  registryTitle: {
    fontSize: theme.fontSize.regular,
    fontFamily: theme.fontFamily.bold,
    color: theme.color.textPrimary,
    marginBottom: 8,
  },
  registryImage: {
    width: 45,
    height: 40,
    borderRadius: 4,
    marginBottom: 12,
    backgroundColor: theme.color.backgroundSecondary,
  },
}));
