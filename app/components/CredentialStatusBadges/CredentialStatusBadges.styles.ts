import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(() => ({
  container: {
    flexDirection: 'row',
    marginHorizontal: -2,
    flexWrap: 'wrap'
  }
}))
