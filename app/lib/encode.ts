const PARAM_REGEX = /=([^&]+)/g
const RESERVED_REGEX = /[;,/?:@&=+$]/g

/**
 * Utility method for encoding url query params containing reserved
 * characters.
 */
export function encodeQueryParams(url: string): string {
  return url.replace(PARAM_REGEX, (_, value) => {
    if (value.match(RESERVED_REGEX)) {
      return `=${encodeURIComponent(value)}`
    } else {
      return `=${value}`
    }
  })
}

export function cleanCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
