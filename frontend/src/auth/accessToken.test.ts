import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const msalMocks = vi.hoisted(() => ({
  acquireTokenRedirect: vi.fn(),
  acquireTokenSilent: vi.fn(),
  getActiveAccount: vi.fn(),
  getAllAccounts: vi.fn(),
}))

vi.mock('./authConfig', () => ({
  apiTokenRequest: { scopes: ['api://fastapi/access_as_user'] },
}))

vi.mock('./msalInstance', () => ({
  msalInstance: msalMocks,
}))

import {
  acquireFastApiAccessToken,
  AuthenticationRequiredError,
  TokenRedirectStartedError,
} from './accessToken'

describe('acquireFastApiAccessToken', () => {
  const account = { homeAccountId: 'account-id' }

  beforeEach(() => {
    msalMocks.acquireTokenRedirect.mockReset().mockResolvedValue(undefined)
    msalMocks.acquireTokenSilent.mockReset()
    msalMocks.getActiveAccount.mockReset().mockReturnValue(account)
    msalMocks.getAllAccounts.mockReset().mockReturnValue([])
  })

  it('returns an API access token acquired silently for the configured account', async () => {
    msalMocks.acquireTokenSilent.mockResolvedValue({ accessToken: 'api-access-token' })

    await expect(acquireFastApiAccessToken()).resolves.toBe('api-access-token')
    expect(msalMocks.acquireTokenSilent).toHaveBeenCalledWith({
      scopes: ['api://fastapi/access_as_user'],
      account,
    })
    expect(msalMocks.acquireTokenRedirect).not.toHaveBeenCalled()
  })

  it('starts redirect acquisition only when MSAL requires interaction', async () => {
    msalMocks.acquireTokenSilent.mockRejectedValue(
      new InteractionRequiredAuthError('interaction_required', 'correlation-id'),
    )

    await expect(acquireFastApiAccessToken()).rejects.toBeInstanceOf(
      TokenRedirectStartedError,
    )
    expect(msalMocks.acquireTokenRedirect).toHaveBeenCalledWith({
      scopes: ['api://fastapi/access_as_user'],
      account,
      redirectStartPage: window.location.href,
    })
  })

  it('does not start an interactive request for unrelated failures', async () => {
    const error = new Error('Network unavailable')
    msalMocks.acquireTokenSilent.mockRejectedValue(error)

    await expect(acquireFastApiAccessToken()).rejects.toBe(error)
    expect(msalMocks.acquireTokenRedirect).not.toHaveBeenCalled()
  })

  it('fails before token acquisition when no authenticated account exists', async () => {
    msalMocks.getActiveAccount.mockReturnValue(null)
    msalMocks.getAllAccounts.mockReturnValue([])

    await expect(acquireFastApiAccessToken()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    )
    expect(msalMocks.acquireTokenSilent).not.toHaveBeenCalled()
  })

  it('rejects an empty access token', async () => {
    msalMocks.acquireTokenSilent.mockResolvedValue({ accessToken: '' })

    await expect(acquireFastApiAccessToken()).rejects.toThrow(
      'Microsoft did not return an access token for the FastAPI API.',
    )
  })
})
