export type { DetailsScreenProps } from '../../navigation'

export type DetailsScreenParams = {
  header: string
  details: Record<string, string[]>
  goBack?: () => void
}
