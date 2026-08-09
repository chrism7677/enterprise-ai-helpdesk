import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from './authConfig'

export const msalInstance = new PublicClientApplication(msalConfig)

export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize()

  const redirectResult = await msalInstance.handleRedirectPromise()
  const account =
    redirectResult?.account ??
    msalInstance.getActiveAccount() ??
    msalInstance.getAllAccounts()[0]

  if (account) {
    msalInstance.setActiveAccount(account)
  }
}
