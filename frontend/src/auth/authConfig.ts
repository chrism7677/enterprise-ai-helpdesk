import type { Configuration, RedirectRequest } from '@azure/msal-browser'

function requireEnvironmentVariable(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const clientId = requireEnvironmentVariable(
  'VITE_ENTRA_CLIENT_ID',
  import.meta.env.VITE_ENTRA_CLIENT_ID,
)
const tenantId = requireEnvironmentVariable(
  'VITE_ENTRA_TENANT_ID',
  import.meta.env.VITE_ENTRA_TENANT_ID,
)
const apiScope = requireEnvironmentVariable(
  'VITE_ENTRA_API_SCOPE',
  import.meta.env.VITE_ENTRA_API_SCOPE,
)

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const apiTokenRequest: RedirectRequest = {
  scopes: [apiScope],
}
