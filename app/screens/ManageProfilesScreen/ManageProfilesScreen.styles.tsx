import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    flexDirection: 'column',
    padding: 16,
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
  input: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary,
  },
}));
