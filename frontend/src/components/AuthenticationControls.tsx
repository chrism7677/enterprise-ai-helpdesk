import { useState } from 'react'
import { InteractionStatus } from '@azure/msal-browser'
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react'

export function AuthenticationControls() {
  const { instance, accounts, inProgress } = useMsal()
  const [authenticationError, setAuthenticationError] = useState<string | null>(null)
  const interactionInProgress = inProgress !== InteractionStatus.None
  const account = accounts[0]

  async function handleSignIn(): Promise<void> {
    setAuthenticationError(null)

    try {
      await instance.loginRedirect()
    } catch (error) {
      setAuthenticationError(
        error instanceof Error ? error.message : 'Microsoft sign-in could not be started.',
      )
    }
  }

  async function handleSignOut(): Promise<void> {
    setAuthenticationError(null)

    try {
      await instance.logoutRedirect({
        account,
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (error) {
      setAuthenticationError(
        error instanceof Error ? error.message : 'Microsoft sign-out could not be started.',
      )
    }
  }

  return (
    <aside className="authentication-bar" aria-label="Microsoft account">
      <div className="authentication-content">
        <AuthenticatedTemplate>
          <span className="authentication-status">
            Signed in as <strong>{account?.name ?? account?.username}</strong>
          </span>
          <button
            className="authentication-button"
            type="button"
            onClick={handleSignOut}
            disabled={interactionInProgress}
          >
            Sign out
          </button>
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <span className="authentication-status">Sign in to verify Microsoft Entra ID.</span>
          <button
            className="authentication-button"
            type="button"
            onClick={handleSignIn}
            disabled={interactionInProgress}
          >
            Sign in with Microsoft
          </button>
        </UnauthenticatedTemplate>
      </div>
      {authenticationError && (
        <p className="authentication-error" role="alert">
          {authenticationError}
        </p>
      )}
    </aside>
  )
}
