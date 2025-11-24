import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(() => ({
  checkmarkContainer: {
    position: 'absolute',
    height: '100%',
    alignSelf: 'center',
    justifyContent: 'center'
  }
}))
