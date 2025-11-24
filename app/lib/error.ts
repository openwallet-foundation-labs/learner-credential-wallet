const FALLBACK_ERROR_MESSAGE = 'Something went wrong'
const HUMAN_READABLE_ERROR_NAME = 'HumanReadableError'

export class HumanReadableError extends Error {
  constructor(message: string) {
    super(message)
    this.message = message
    this.name = HUMAN_READABLE_ERROR_NAME
  }
}

function isHumanReadableError(err: unknown): err is HumanReadableError {
  return (err as Error).name === HUMAN_READABLE_ERROR_NAME
}

export function errorMessageFrom(
  err: unknown,
  fallback = FALLBACK_ERROR_MESSAGE
): string {
  if (isHumanReadableError(err)) {
    return err.message
  } else {
    console.error(err)
    return fallback
  }
}

export function errorMessageMatches(
  err: unknown,
  messages: string[] | string
): err is Error {
  const errorMessage = (err as Error).message

  if (!(messages instanceof Array)) {
    messages = [messages]
  }

  for (const message of messages) {
    if (errorMessage.includes(message)) return true
  }

  return false
}
