import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { apiTokenRequest } from './authConfig'
import { msalInstance } from './msalInstance'

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Sign in with Microsoft before accessing helpdesk data.')
    this.name = 'AuthenticationRequiredError'
  }
}

export class TokenRedirectStartedError extends Error {
  constructor() {
    super('Microsoft authentication redirected before an access token was returned.')
    this.name = 'TokenRedirectStartedError'
  }
}

export async function acquireFastApiAccessToken(): Promise<string> {
  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]

  if (!account) {
    throw new AuthenticationRequiredError()
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...apiTokenRequest,
      account,
    })

    if (!result.accessToken) {
      throw new Error('Microsoft did not return an access token for the FastAPI API.')
    }

    return result.accessToken
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) {
      throw error
    }

    await msalInstance.acquireTokenRedirect({
      ...apiTokenRequest,
      account,
      redirectStartPage: window.location.href,
    })

    // A real redirect unloads this page. This protects callers if navigation
    // is prevented so they never send a request without a valid access token.
    throw new TokenRedirectStartedError()
  }
}
