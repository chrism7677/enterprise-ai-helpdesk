import { createContext, useContext } from 'react'
import type { CurrentUser } from '../api/currentUser'

export type ApplicationAuthState =
  | { status: 'loading'; currentUser: null }
  | { status: 'unauthenticated'; currentUser: null }
  | { status: 'authenticated'; currentUser: CurrentUser }
  | { status: 'unmapped'; currentUser: null }
  | { status: 'error'; currentUser: null }

export const ApplicationAuthContext =
  createContext<ApplicationAuthState | null>(null)

export function useApplicationAuth(): ApplicationAuthState {
  const context = useContext(ApplicationAuthContext)
  if (context === null) {
    throw new Error(
      'useApplicationAuth must be used within an ApplicationAuthProvider.',
    )
  }
  return context
}
