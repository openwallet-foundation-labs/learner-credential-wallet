import { ReportDetails } from '../../lib/import'

export type SubmitPasswordCallback = (password: string) => void

export type ImportFileModalHandle = {
  doImport: () => void
}

export type ImportFileModalProps = {
  onPressDetails: (reportDetails: ReportDetails) => void
  importItem: (data: string) => Promise<ReportDetails | undefined>
  onFinished: () => void
  textConfig: {
    loadingTitle: string
    lockedTitle: string
    lockedBody: string
    finishedTitle: string
    finishedButton: string
    errorBody: string
  }
}
