export type BackupItemModalProps = {
  onRequestClose: () => void
  open?: boolean
  onBackup: () => Promise<void>
  backupItemName: string
  backupModalText: string
}
