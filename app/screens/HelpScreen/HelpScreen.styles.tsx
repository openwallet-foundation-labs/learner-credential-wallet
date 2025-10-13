import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  bodyContainerCenter: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.color.backgroundPrimary,
  },
  image: {
    height: 72,
    resizeMode: 'contain',
    marginTop: 30,
  },
  link: {
    color: theme.color.linkColor,
  },
  paragraphCenter: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    marginTop: 30,
  },
  aboutTitleBolded: {
    ...mixins.paragraphText,
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    marginTop: 30,
  },
}));