import { it, describe, mock, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  isInteractionUrl,
  parseInteractionUrl,
  fetchInteractionProtocols
} from '../app/lib/interactionUrl'

describe('isInteractionUrl', () => {
  it('detects interaction: scheme with plaintext URL', () => {
    assert.strictEqual(
      isInteractionUrl('interaction:https://example.com/path?iuv=1'),
      true
    )
  })

  it('detects interaction: scheme with URL-encoded URL', () => {
    assert.strictEqual(
      isInteractionUrl(
        'interaction:https%3A%2F%2Fexample.com%2Fpath%3Fiuv%3D1'
      ),
      true
    )
  })

  it('detects HTTPS URL with iuv=1', () => {
    assert.strictEqual(isInteractionUrl('https://example.com/path?iuv=1'), true)
  })

  it('detects HTTPS URL with iuv=2 (any iuv value)', () => {
    assert.strictEqual(isInteractionUrl('https://example.com/path?iuv=2'), true)
  })

  it('returns false for HTTPS URL without iuv', () => {
    assert.strictEqual(isInteractionUrl('https://example.com/path'), false)
  })

  it('returns false for wallet API request URL', () => {
    assert.strictEqual(
      isInteractionUrl(
        'https://lcw.app/request?request=%7B%22protocols%22%3A%7B%7D%7D'
      ),
      false
    )
  })

  it('returns false for dccrequest:// URL', () => {
    assert.strictEqual(
      isInteractionUrl(
        'dccrequest://request?request=%7B%22protocols%22%3A%7B%7D%7D'
      ),
      false
    )
  })

  it('returns false for non-URL text', () => {
    assert.strictEqual(isInteractionUrl('not a url'), false)
  })
})

describe('parseInteractionUrl', () => {
  it('strips interaction: prefix from plaintext URL', () => {
    assert.strictEqual(
      parseInteractionUrl('interaction:https://example.com/path?iuv=1'),
      'https://example.com/path?iuv=1'
    )
  })

  it('strips interaction: prefix and decodes URL-encoded URL', () => {
    assert.strictEqual(
      parseInteractionUrl(
        'interaction:https%3A%2F%2Fexample.com%2Fpath%3Fiuv%3D1'
      ),
      'https://example.com/path?iuv=1'
    )
  })

  it('returns HTTPS interaction URL as-is', () => {
    assert.strictEqual(
      parseInteractionUrl('https://example.com/path?iuv=1'),
      'https://example.com/path?iuv=1'
    )
  })

  it('handles interaction: with http (non-https) URL', () => {
    assert.strictEqual(
      parseInteractionUrl('interaction:http://localhost:3000/path?iuv=1'),
      'http://localhost:3000/path?iuv=1'
    )
  })

  it('handles interaction: with URL-encoded http URL', () => {
    assert.strictEqual(
      parseInteractionUrl(
        'interaction:http%3A%2F%2Flocalhost%3A3000%2Fpath%3Fiuv%3D1'
      ),
      'http://localhost:3000/path?iuv=1'
    )
  })
})

describe('fetchInteractionProtocols', () => {
  beforeEach(() => {
    mock.restoreAll()
  })

  it('fetches with GET and Accept: application/json', async () => {
    const protocols = {
      vcapi: 'https://saas.example/workflows/123/exchanges/987'
    }

    mock.method(globalThis, 'fetch', async (url: string, init: any) => {
      assert.strictEqual(url, 'https://example.com/interactions/abc?iuv=1')
      assert.strictEqual(init.headers.Accept, 'application/json')
      return { ok: true, json: async () => ({ protocols }) }
    })

    const result = await fetchInteractionProtocols(
      'https://example.com/interactions/abc?iuv=1'
    )
    assert.deepStrictEqual(result, protocols)
  })

  it('returns protocols map with multiple protocols', async () => {
    const protocols = {
      vcapi: 'https://saas.example/workflows/123/exchanges/987',
      OID4VP: 'openid4vp://?client_id=...'
    }

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ protocols })
    }))

    const result = await fetchInteractionProtocols(
      'https://example.com/interactions/abc?iuv=1'
    )
    assert.deepStrictEqual(result, protocols)
  })

  it('returns protocols even when no vcapi (caller decides)', async () => {
    const protocols = { OID4VP: 'openid4vp://?client_id=...' }

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ protocols })
    }))

    const result = await fetchInteractionProtocols(
      'https://example.com/interactions/abc?iuv=1'
    )
    assert.deepStrictEqual(result, protocols)
  })

  it('throws when response has no protocols key', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({})
    }))

    await assert.rejects(
      () =>
        fetchInteractionProtocols('https://example.com/interactions/abc?iuv=1'),
      { message: 'Interaction URL response missing "protocols" map.' }
    )
  })

  it('throws when response is not ok', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }))

    await assert.rejects(
      () =>
        fetchInteractionProtocols('https://example.com/interactions/abc?iuv=1'),
      { message: 'Interaction URL fetch failed: 404 Not Found' }
    )
  })
})
