import { beforeEach, describe, expect, it, vi } from 'vitest'

const acquireFastApiAccessToken = vi.hoisted(() => vi.fn())

vi.mock('../auth/accessToken', () => ({ acquireFastApiAccessToken }))

import { authenticatedFetch } from './client'
import { API_BASE_URL } from '../config'

describe('authenticatedFetch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    acquireFastApiAccessToken.mockReset()
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  it('adds the FastAPI access token without discarding existing headers', async () => {
    acquireFastApiAccessToken.mockResolvedValue('api-access-token')

    await authenticatedFetch('/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(url).toBe(`${API_BASE_URL}/tickets`)
    expect(headers.get('Authorization')).toBe('Bearer api-access-token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('does not send a request when access-token acquisition fails', async () => {
    acquireFastApiAccessToken.mockRejectedValue(new Error('Sign in required'))

    await expect(authenticatedFetch('/tickets')).rejects.toThrow('Sign in required')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
