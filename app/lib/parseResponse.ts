import * as HtmlEntities from 'html-entities'

export async function parseResponseBody(
  response: Response
): Promise<Record<string, unknown>> {
  const responseText = await response.text()
  const responseTextDecoded = HtmlEntities.decode(responseText)
  const responseJson = JSON.parse(responseTextDecoded)

  return responseJson
}
