import { MaterialIcons } from '@expo/vector-icons'

export type MenuItemProps = {
  icon?: React.ComponentProps<typeof MaterialIcons>['name']
  title: string
  testID?: string
  onPress: () => void
}
