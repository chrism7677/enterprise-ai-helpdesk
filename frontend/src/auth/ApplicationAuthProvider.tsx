import { InteractionStatus } from '@azure/msal-browser'
import { useMsal } from '@azure/msal-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CurrentUserNotRegisteredError,
  getCurrentUser,
} from '../api/currentUser'
import {
  ApplicationAuthContext,
  type ApplicationAuthState,
} from './ApplicationAuthContext'

interface ResolvedAccountState {
  accountId: string
  state: Extract<
    ApplicationAuthState,
    { status: 'authenticated' | 'unmapped' | 'error' }
  >
}

export function ApplicationAuthProvider({ children }: { children: ReactNode }) {
  const { accounts, inProgress } = useMsal()
  const account = accounts[0]
  const accountId = account?.homeAccountId ?? account?.username ?? null
  const [resolvedAccount, setResolvedAccount] =
    useState<ResolvedAccountState | null>(null)

  useEffect(() => {
    if (inProgress !== InteractionStatus.None || accountId === null) {
      return
    }

    let isCancelled = false

    getCurrentUser()
      .then((currentUser) => {
        if (!isCancelled) {
          setResolvedAccount({
            accountId,
            state: { status: 'authenticated', currentUser },
          })
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setResolvedAccount({
            accountId,
            state:
              error instanceof CurrentUserNotRegisteredError
                ? { status: 'unmapped', currentUser: null }
                : { status: 'error', currentUser: null },
          })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [accountId, inProgress])

  const value = useMemo<ApplicationAuthState>(() => {
    if (inProgress !== InteractionStatus.None) {
      return { status: 'loading', currentUser: null }
    }
    if (accountId === null) {
      return { status: 'unauthenticated', currentUser: null }
    }
    if (resolvedAccount?.accountId !== accountId) {
      return { status: 'loading', currentUser: null }
    }
    return resolvedAccount.state
  }, [accountId, inProgress, resolvedAccount])

  return (
    <ApplicationAuthContext.Provider value={value}>
      {children}
    </ApplicationAuthContext.Provider>
  )
}
