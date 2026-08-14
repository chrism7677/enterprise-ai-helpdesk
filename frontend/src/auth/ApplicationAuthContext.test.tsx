import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => {
  class NotRegisteredError extends Error {}

  return {
    accounts: [] as Array<{ homeAccountId: string; username: string }>,
    getCurrentUser: vi.fn(),
    inProgress: 'none',
    NotRegisteredError,
  }
})

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    accounts: authMocks.accounts,
    inProgress: authMocks.inProgress,
  }),
}))

vi.mock('../api/currentUser', () => ({
  CurrentUserNotRegisteredError: authMocks.NotRegisteredError,
  getCurrentUser: authMocks.getCurrentUser,
}))

import {
  useApplicationAuth,
} from './ApplicationAuthContext'
import { ApplicationAuthProvider } from './ApplicationAuthProvider'

function AuthStateProbe() {
  const auth = useApplicationAuth()
  return (
    <p>
      {auth.status}
      {auth.status === 'authenticated' && `:${auth.currentUser.role}`}
    </p>
  )
}

function renderProvider() {
  return render(
    <ApplicationAuthProvider>
      <AuthStateProbe />
    </ApplicationAuthProvider>,
  )
}

describe('ApplicationAuthProvider', () => {
  beforeEach(() => {
    authMocks.accounts.length = 0
    authMocks.inProgress = 'none'
    authMocks.getCurrentUser.mockReset()
  })

  it('reports MSAL initialization as loading without requesting the user', () => {
    authMocks.inProgress = 'startup'

    renderProvider()

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(authMocks.getCurrentUser).not.toHaveBeenCalled()
  })

  it('reports no MSAL account as unauthenticated', () => {
    renderProvider()

    expect(screen.getByText('unauthenticated')).toBeInTheDocument()
    expect(authMocks.getCurrentUser).not.toHaveBeenCalled()
  })

  it('loads the mapped application user for a signed-in account', async () => {
    authMocks.accounts.push({
      homeAccountId: 'employee-account',
      username: 'employee@example.com',
    })
    authMocks.getCurrentUser.mockResolvedValue({
      id: 1,
      name: 'Demo Employee',
      email: 'employee@example.com',
      role: 'employee',
    })

    renderProvider()

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('authenticated:employee')).toBeInTheDocument()
    expect(authMocks.getCurrentUser).toHaveBeenCalledOnce()
  })

  it('reports an unmapped signed-in account without retrying', async () => {
    authMocks.accounts.push({
      homeAccountId: 'unmapped-account',
      username: 'unmapped@example.com',
    })
    authMocks.getCurrentUser.mockRejectedValue(
      new authMocks.NotRegisteredError(),
    )

    renderProvider()

    expect(await screen.findByText('unmapped')).toBeInTheDocument()
    expect(authMocks.getCurrentUser).toHaveBeenCalledOnce()
  })
})
