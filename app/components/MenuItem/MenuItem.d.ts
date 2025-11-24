import { MaterialIcons } from '@expo/vector-icons'

export type MenuItemProps = {
  icon?: React.ComponentProps<typeof MaterialIcons>['name']
  title: string
  onPress: () => void
}
