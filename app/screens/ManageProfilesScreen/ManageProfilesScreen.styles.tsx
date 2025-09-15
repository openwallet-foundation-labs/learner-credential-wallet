import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: 16,
    flex: 1,
  },
  input: {
    ...mixins.input,
    backgroundColor: theme.color.foregroundPrimary,
  },
}));
