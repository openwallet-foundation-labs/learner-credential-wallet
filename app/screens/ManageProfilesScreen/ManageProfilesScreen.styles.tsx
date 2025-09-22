import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  input: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary,
  },
}));
