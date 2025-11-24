import { HeaderProps } from 'react-native-elements'

export type NavHeaderProps = HeaderProps & {
  title: string
  goBack?: () => void
}
