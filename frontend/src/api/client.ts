import { acquireFastApiAccessToken } from '../auth/accessToken'
import { API_BASE_URL } from '../config'

export async function authenticatedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const accessToken = await acquireFastApiAccessToken()
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })
}
