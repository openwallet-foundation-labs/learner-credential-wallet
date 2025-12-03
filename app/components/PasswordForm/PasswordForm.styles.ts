import { createDynamicStyleSheet } from '../../lib/dynamicStyles'
import { Color } from '../../styles'

export default createDynamicStyleSheet(() => ({
  inputSeparator: {
    height: 14
  },
  helperText: {
    fontSize: 12,
    color: Color.Gray400,
    marginTop: 8
  }
}))
