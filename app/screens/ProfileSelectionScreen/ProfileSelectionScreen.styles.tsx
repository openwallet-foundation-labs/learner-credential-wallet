import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    flexDirection: 'column-reverse',
    padding: 16,
    flex: 1,
  },
  listHeader: {
    marginVertical: 8,
  },
  input: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary,
  },
}));
