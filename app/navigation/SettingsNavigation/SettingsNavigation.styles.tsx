import { Platform } from 'react-native'
import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

const switchScale = Platform.select({ ios: 0.9, android: 1 }) || 1

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  bodyContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.color.backgroundPrimary
  },
  bodyContainerCenter: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.color.backgroundPrimary
  },
  settingsContainer: {
    backgroundColor: theme.color.backgroundPrimary
  },
  listItemTitle: {
    color: theme.color.textSecondary,
    paddingTop: 8,
    paddingBottom: 8
  },
  listItemContainer: {
    backgroundColor: theme.color.backgroundPrimary,
    borderBottomColor: theme.color.backgroundSecondary,
    borderBottomWidth: 3
  },
  listItemContainerDisabled: {
    opacity: 0.5
  },
  buttonContainer: {
    ...mixins.buttonIconContainer,
    marginTop: 24
  },
  buttonStyle: {
    backgroundColor: theme.color.transparent
  },
  iconStyle: {
    color: theme.color.textPrimary,
    position: 'absolute',
    paddingLeft: 5
  },
  image: {
    height: 72,
    resizeMode: 'contain',
    marginTop: 30
  },
  link: {
    color: theme.color.linkColor
  },
  title: {
    ...mixins.headerText
  },
  paragraph: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.medium,
    marginTop: 8
  },
  paragraphCenter: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    marginTop: 30
  },
  aboutTitleBolded: {
    ...mixins.paragraphText,
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    marginTop: 30
  },
  header: {
    ...mixins.headerText,
    fontSize: theme.fontSize.regular
  },
  bulletItem: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.regular,
    marginBottom: -4
  },
  sectionContainer: {
    marginVertical: 16
  },
  reportSummary: {
    ...mixins.paragraphText,
    lineHeight: 24,
    marginVertical: 8,
    textAlign: 'center'
  },
  loadingDots: {
    marginTop: -100,
    fontSize: 130,
    letterSpacing: -15,
    color: theme.color.textHeader
  },
  loadingContainer: {
    marginLeft: -10,
    marginBottom: -20,
    alignItems: 'center'
  },
  switch: {
    transform: [{ scale: switchScale }]
  }
}))
