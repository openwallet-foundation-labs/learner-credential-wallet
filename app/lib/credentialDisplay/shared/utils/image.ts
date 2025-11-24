import { IImageObject } from '@digitalcredentials/ssi'

function isImageObject(obj: unknown): obj is IImageObject {
  const imageObject = obj as IImageObject
  return (
    typeof imageObject === 'object' &&
    'id' in imageObject &&
    'type' in imageObject
  )
}

export function imageSourceFrom(
  image?: IImageObject | string | null
): string | null {
  if (image === undefined) return null
  if (isImageObject(image)) return image.id
  if (typeof image === 'string') return image

  return null
}
