import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    padding: 16,
  },
  warningText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.regular,
    color: '#856404',
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
}));
