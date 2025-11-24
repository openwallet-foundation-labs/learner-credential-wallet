import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    backgroundColor: theme.color.backgroundSecondary,
    borderRadius: theme.borderRadius,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  headerText: {
    ...mixins.headerText,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.regular,
    marginVertical: 8
  },
  statusItem: {
    flexDirection: 'row',
    marginVertical: 8
  },
  statusItemContent: {
    marginRight: 16,
    marginLeft: 8
  },
  warningCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'orange',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },

  warningText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center'
  },
  statusItemLabel: {
    ...mixins.paragraphText
  },
  bodyText: {
    ...mixins.paragraphText,
    marginVertical: 8,
    lineHeight: 22
  },
  sectionTitle: {
    ...mixins.headerText,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.regular,
    marginBottom: 8
  },
  subTitle: {
    ...mixins.paragraphText,
    fontWeight: '600',
    fontSize: theme.fontSize.small,
    marginBottom: 12
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  statusIcon: {
    marginRight: 8
  },
  statusText: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.small,
    flex: 1
  },
  lastChecked: {
    ...mixins.paragraphText,
    fontSize: theme.fontSize.small,
    color: theme.color.textSecondary,
    marginTop: 5,
    marginLeft: 28
  }
}))
