import { convertSVGtoPDF } from '../app/lib/svgToPdf'
import RNHTMLtoPDF from 'react-native-html-to-pdf'
import Handlebars from 'handlebars'
import { mockCredential } from '../app/mock/credential'

// Mocks
jest.mock('react-native-html-to-pdf', () => ({
  convert: jest.fn()
}))

jest.mock('handlebars', () => ({
  compile: jest.fn()
}))

global.fetch = jest.fn()

describe('convertSVGtoPDF', () => {
  const publicLink = 'https://example.com/publicLink'
  const qrCodeBase64 = 'testBase64QRCode'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null if required data is missing', async () => {
    // Missing publicLink
    expect(await convertSVGtoPDF(mockCredential, null, qrCodeBase64)).toBeNull()

    // Missing qrCodeBase64
    expect(await convertSVGtoPDF(mockCredential, publicLink, null)).toBeNull()
  })

  it('should handle fetch errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network Error')
    )

    const result = await convertSVGtoPDF(
      mockCredential,
      publicLink,
      qrCodeBase64
    )

    // If fetch fails, the result should be null
    expect(result).toBeNull()
  })

  it('should handle invalid HTTP response when fetching template', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    const result = await convertSVGtoPDF(
      mockCredential,
      publicLink,
      qrCodeBase64
    )

    // If response is not OK, the result should be null
    expect(result).toBeNull()
  })

  it('should fetch the template and generate a PDF', async () => {
    const modifiedCredential = {
      ...mockCredential,
      renderMethod: [
        {
          id: 'https://raw.githubusercontent.com/digitalcredentials/test-files/main/html-templates/rendermethod-qrcode-test.html',
          type: 'HTML'
        }
      ]
    }

    const templateHtml = '<html><body>{{ qr_code }}</body></html>'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(templateHtml)
    })

    // Mock Handlebars.compile to return a function that generates the final HTML with embedded QR code
    const mockCompiledTemplate = jest
      .fn()
      .mockReturnValue((data: { qr_code: any }) => {
        return `<html><body>data:image/png;base64, ${data.qr_code}</body></html>`
      })
    ;(Handlebars.compile as jest.Mock).mockImplementation(mockCompiledTemplate)

    const mockPdfResult = { filePath: 'path/to/pdf' }
    ;(RNHTMLtoPDF.convert as jest.Mock).mockResolvedValueOnce(mockPdfResult)

    const result = await convertSVGtoPDF(
      modifiedCredential,
      publicLink,
      qrCodeBase64
    )

    // Ensure fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      modifiedCredential.renderMethod[0].id
    )

    // Ensure RNHTMLtoPDF.convert was called with the correct HTML and options
    expect(RNHTMLtoPDF.convert).toHaveBeenCalledWith({
      html: `<html><body>data:image/png;base64, ${qrCodeBase64}</body></html>`,
      fileName: 'undefined Credential',
      base64: false
    })

    // Ensure the result is the expected PDF output
    expect(result).toEqual(mockPdfResult)
  })

  it('should embed the qrCodeBase64 correctly in the template', async () => {
    const modifiedCredential = {
      ...mockCredential,
      renderMethod: [
        {
          id: 'https://raw.githubusercontent.com/digitalcredentials/test-files/main/html-templates/rendermethod-qrcode-test.html',
          type: 'HTML'
        }
      ]
    }

    const templateHtml = '<html><body>{{ qr_code }}</body></html>'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(templateHtml)
    })

    const mockCompiledTemplate = jest
      .fn()
      .mockReturnValue((data: { qr_code: any }) => {
        return `<html><body>data:image/png;base64, ${data.qr_code}</body></html>`
      })
    ;(Handlebars.compile as jest.Mock).mockImplementation(mockCompiledTemplate)

    const mockPdfResult = { filePath: 'path/to/pdf' }
    ;(RNHTMLtoPDF.convert as jest.Mock).mockResolvedValueOnce(mockPdfResult)

    await convertSVGtoPDF(modifiedCredential, publicLink, qrCodeBase64)

    // Check that the SVG with the correct QR code embedded was passed to RNHTMLtoPDF.convert
    expect(RNHTMLtoPDF.convert).toHaveBeenCalledWith({
      html: `<html><body>data:image/png;base64, ${qrCodeBase64}</body></html>`,
      fileName: 'undefined Credential',
      base64: false
    })
  })
})
