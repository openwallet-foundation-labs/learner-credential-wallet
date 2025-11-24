import { MaterialIcons } from '@expo/vector-icons'
import { Color } from '../../styles'

export type StatusBadgeProps = {
  label: string
  icon?: React.ComponentProps<typeof MaterialIcons>['name']
  color: Color
  backgroundColor: Color
}
