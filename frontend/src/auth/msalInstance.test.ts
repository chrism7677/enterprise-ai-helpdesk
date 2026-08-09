import { beforeEach, describe, expect, it, vi } from 'vitest'

const msalMocks = vi.hoisted(() => ({
  getActiveAccount: vi.fn(),
  getAllAccounts: vi.fn(),
  handleRedirectPromise: vi.fn(),
  initialize: vi.fn(),
  setActiveAccount: vi.fn(),
}))

vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: class {
    constructor() {
      return msalMocks
    }
  },
}))

vi.mock('./authConfig', () => ({
  msalConfig: {},
}))

import { initializeMsal } from './msalInstance'

describe('initializeMsal', () => {
  beforeEach(() => {
    msalMocks.initialize.mockReset().mockResolvedValue(undefined)
    msalMocks.handleRedirectPromise.mockReset().mockResolvedValue(null)
    msalMocks.getActiveAccount.mockReset().mockReturnValue(null)
    msalMocks.getAllAccounts.mockReset().mockReturnValue([])
    msalMocks.setActiveAccount.mockReset()
  })

  it('initializes MSAL before processing the redirect result', async () => {
    const account = { homeAccountId: 'redirect-account' }
    msalMocks.handleRedirectPromise.mockResolvedValue({ account })

    await initializeMsal()

    expect(msalMocks.initialize).toHaveBeenCalledOnce()
    expect(msalMocks.handleRedirectPromise).toHaveBeenCalledOnce()
    expect(msalMocks.initialize.mock.invocationCallOrder[0]).toBeLessThan(
      msalMocks.handleRedirectPromise.mock.invocationCallOrder[0],
    )
    expect(msalMocks.setActiveAccount).toHaveBeenCalledWith(account)
  })

  it('restores an account already present in the MSAL cache', async () => {
    const account = { homeAccountId: 'cached-account' }
    msalMocks.getAllAccounts.mockReturnValue([account])

    await initializeMsal()

    expect(msalMocks.setActiveAccount).toHaveBeenCalledWith(account)
  })
})
