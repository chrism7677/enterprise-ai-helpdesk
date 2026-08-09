import {
  EventType,
  PublicClientApplication,
  type AuthenticationResult,
} from '@azure/msal-browser'
import { msalConfig } from './authConfig'

export const msalInstance = new PublicClientApplication(msalConfig)

msalInstance.addEventCallback((event) => {
  if (
    event.eventType === EventType.LOGIN_SUCCESS &&
    event.payload &&
    'account' in event.payload
  ) {
    const authenticationResult = event.payload as AuthenticationResult
    msalInstance.setActiveAccount(authenticationResult.account)
  }
})
