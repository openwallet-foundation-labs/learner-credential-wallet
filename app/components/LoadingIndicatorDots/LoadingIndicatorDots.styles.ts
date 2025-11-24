import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  loadingContainer: {
    marginLeft: -10,
    marginBottom: -20,
    marginTop: 10,
    alignItems: 'center'
  },
  loadingDots: {
    marginTop: -100,
    fontSize: 130,
    letterSpacing: -15,
    color: theme.color.textHeader
  }
}))
