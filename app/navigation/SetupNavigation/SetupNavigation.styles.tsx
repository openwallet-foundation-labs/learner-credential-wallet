import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center'
  },
  containerMiddle: {
    justifyContent: 'center'
  },
  image: {
    height: 72,
    resizeMode: 'contain'
  },
  title: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.title,
    color: theme.color.textPrimary,
    padding: 16,
    textAlign: 'center'
  },
  paragraph: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.medium,
    textAlign: 'center',
    marginBottom: 48
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  buttonGroupCenterContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepText: {
    color: theme.color.iconInactive,
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.bold
  },
  stepTextActive: {
    color: theme.color.textPrimary
  },
  stepDivider: {
    borderBottomColor: theme.color.iconInactive,
    borderBottomWidth: 1,
    width: 24,
    height: 1,
    marginHorizontal: 12
  },
  header: {
    fontSize: theme.fontSize.header,
    fontFamily: theme.fontFamily.bold,
    color: theme.color.textHeader,
    textAlign: 'center',
    marginTop: 32
  },
  paragraphRegular: {
    ...mixins.paragraphText,
    textAlign: 'center',
    margin: 8
  },
  arrowIcon: {
    marginLeft: 20
  },
  buttonClear: {
    backgroundColor: theme.color.transparent
  },
  buttonClearContainer: {
    flex: 1
  },
  buttonClearTitle: {
    color: theme.color.textSecondary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  inputGroup: {
    width: '100%',
    paddingTop: 40
  },
  inputSeparator: {
    height: 20
  },
  topMargin: {
    marginTop: 16
  },
  customMethodContainer: {
    flex: 1,
    padding: 16
  },
  customMethodStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
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
  reportLoadingContainer: {
    marginLeft: -10,
    marginBottom: -20,
    alignItems: 'center'
  },

  reportButtonClear: {
    ...mixins.button,
    backgroundColor: theme.color.transparent
  },
  reportButtonClearContainer: {
    width: '100%'
  },
  reportButtonClearTitle: {
    ...mixins.buttonTitle,
    color: theme.color.textSecondary,
    fontFamily: theme.fontFamily.regular,
    textDecorationLine: 'underline'
  },
  biometricsButton: {
    ...mixins.shadow,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.color.foregroundPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14
  },
  biometricsButtonText: {
    color: theme.color.textPrimary,
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular
  },
  checkboxContainer: {
    height: 24,
    width: 24,
    marginRight: 16
  },
  body: {
    flex: 1,
    width: '100%',
    justifyContent: 'center'
  }
}))
