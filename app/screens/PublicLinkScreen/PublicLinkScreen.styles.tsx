import { Color } from '../../styles'
import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16
  },
  instructions: {
    ...mixins.paragraphText,
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.regular,
    marginBottom: 16
  },
  scrollContainer: {
    flexGrow: 1
  },
  outerContainer: {
    flex: 1
  },
  link: {
    display: 'flex',
    flexDirection: 'row'
  },
  copyButton: {
    paddingLeft: 24,
    paddingRight: 24,
    flexGrow: 1
  },
  copyButtonContainer: {
    ...mixins.shadow,
    marginLeft: 8,
    display: 'flex',
    flexDirection: 'row',
    flex: 0,
    marginTop: 6
  },
  createLinkButtonContainer: {
    marginVertical: 0,
    marginTop: 8
  },
  linkText: {
    flex: 1,
    textAlign: 'auto'
  },
  actions: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end'
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8
  },
  spacer: {
    width: 8
  },
  actionIcon: {
    marginRight: 8
  },
  otherOptionsContainer: {
    marginTop: 8
  },
  bottomSection: {
    marginTop: 16
  },
  qrCodeContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16
  },
  qrCode: {
    padding: 8,
    backgroundColor: Color.White
  },
  title: {
    ...mixins.headerText,
    color: theme.color.textPrimary,
    marginBottom: 16
  },
  paragraph: {
    fontSize: 14,
    color: theme.color.textPrimary,
    marginTop: 8
  }
}))
