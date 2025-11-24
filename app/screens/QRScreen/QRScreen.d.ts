export type { QRScreenProps } from '../../navigation'

export type QRScreenParams = {
  onReadQRCode: (text: string) => Promise<void> | void
  instructionText: string
}
