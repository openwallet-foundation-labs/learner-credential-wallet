import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  container: {
    padding: 16,
    paddingBottom: 0,
    flex: 1
  },
  listContainer: {
    marginTop: 8
  },
  listContentContainer: {
    paddingBottom: 8
  },
  doneButton: {
    backgroundColor: theme.color.transparent,
    padding: 0,
    alignItems: 'center'
  },
  doneButtonTitle: {
    lineHeight: 17,
    paddingHorizontal: 8,
    color: theme.color.textHeader,
    fontSize: theme.fontSize.regular
  },
  profileText: {
    ...mixins.paragraphText
  },
  profileTextBold: {
    fontFamily: theme.fontFamily.bold
  },
  listHeader: {
    marginVertical: 8
  },
  footerContainer: {
    ...mixins.shadow,
    backgroundColor: theme.color.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  acceptAllButton: {
    height: 44,
    minHeight: undefined
  },
  acceptAllButtonTitle: {
    fontSize: 14
  }
}))
