import { createDynamicStyleSheet } from '../../lib/dynamicStyles'
import { Color } from '../../styles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  scannerBody: {
    flex: 1,
    backgroundColor: Color.Black
  },
  instructionContainer: {
    backgroundColor: theme.color.backgroundPrimary,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingVertical: 16,
    paddingHorizontal: 4,
    zIndex: 1
  },
  instructionText: {
    ...mixins.paragraphText,
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
    flex: 0
  },
  cameraStyle: {
    flex: 1,
    height: '100%'
  },
  markerStyle: {
    borderColor: Color.White,
    borderRadius: 10,
    borderWidth: 3
  },
  emptyContainer: {
    height: 0,
    flex: 0
  }
}))
