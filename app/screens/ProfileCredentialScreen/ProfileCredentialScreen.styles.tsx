import { createDynamicStyleSheet } from '../../lib/dynamicStyles';

export default createDynamicStyleSheet(({ mixins, theme }) => ({
  container: {
    padding: 16,
    flex: 1,
  },
  swipeItemOuter: {
    ...mixins.shadow,
  },
  swipeButton: {
    ...mixins.buttonIcon,
    flex: 1,
    justifyContent: 'center',
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0,
    flex: 1,
    marginVertical: 10,
  },
  modalBodyText: {
    ...mixins.paragraphText,
    textAlign: 'center',
    lineHeight: 24,
    marginVertical: 8,
  },
  learnMoreContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  learnMoreText: {
    ...mixins.paragraphText,
    textAlign: 'center',
  },
  learnMoreLink: {
    color: theme.color.linkColor,
    textDecorationLine: 'underline',
  },
  header: {
    ...mixins.headerText,
    marginTop: 8,
    marginBottom: 8,
  },
}));