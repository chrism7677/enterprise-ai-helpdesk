import { Navigate, Outlet } from 'react-router-dom'
import type { ApplicationRole } from '../api/currentUser'
import { useApplicationAuth, type ApplicationAuthState } from './ApplicationAuthContext'
import { roleHomePath } from './roles'

function UnavailableAuthState({ state }: { state: ApplicationAuthState }) {
  if (state.status === 'loading') {
    return (
      <main className="page-shell">
        <p role="status">Loading your helpdesk access...</p>
      </main>
    )
  }
  if (state.status === 'unmapped') {
    return (
      <main className="page-shell empty-state">
        <h1>Access denied</h1>
        <p>
          Your Microsoft account is signed in, but it is not registered for
          this helpdesk. Contact your administrator or sign out.
        </p>
      </main>
    )
  }
  if (state.status === 'error') {
    return (
      <main className="page-shell empty-state" role="alert">
        <h1>Unable to verify access</h1>
        <p>We could not verify your helpdesk access. Please try again later.</p>
      </main>
    )
  }
  return null
}

export function RequireRole({ role }: { role: ApplicationRole }) {
  const auth = useApplicationAuth()

  if (auth.status === 'unauthenticated') {
    return <Navigate to="/" replace />
  }
  if (auth.status !== 'authenticated') {
    return <UnavailableAuthState state={auth} />
  }
  if (auth.currentUser.role !== role) {
    return <Navigate to={roleHomePath(auth.currentUser.role)} replace />
  }
  return <Outlet />
}

export function AuthenticatedHome() {
  const auth = useApplicationAuth()

  if (auth.status === 'unauthenticated') {
    return (
      <main className="page-shell empty-state">
        <p className="eyebrow">Enterprise AI Helpdesk</p>
        <h1>Sign in to continue</h1>
        <p>Use your Microsoft account to access your helpdesk workspace.</p>
      </main>
    )
  }
  if (auth.status !== 'authenticated') {
    return <UnavailableAuthState state={auth} />
  }
  return <Navigate to={roleHomePath(auth.currentUser.role)} replace />
}
