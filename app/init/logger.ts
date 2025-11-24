import { FileLogger, LogLevel, logLevelNames } from 'react-native-file-logger'

export async function initializeLogger() {
  function formatter(level: LogLevel, msg: string) {
    const levelName = logLevelNames[level]
    return `> ${new Date().toISOString()} [${levelName}] ${msg}`
  }

  await FileLogger.configure({ formatter, maximumNumberOfFiles: 1 })
}
