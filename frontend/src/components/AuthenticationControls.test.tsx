import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthenticationControls } from './AuthenticationControls'

const msalMocks = vi.hoisted(() => ({
  accounts: [] as Array<{ name?: string; username: string }>,
  loginRedirect: vi.fn(),
  logoutRedirect: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  AuthenticatedTemplate: ({ children }: { children: React.ReactNode }) =>
    msalMocks.accounts.length > 0 ? children : null,
  UnauthenticatedTemplate: ({ children }: { children: React.ReactNode }) =>
    msalMocks.accounts.length === 0 ? children : null,
  useMsal: () => ({
    instance: {
      loginRedirect: msalMocks.loginRedirect,
      logoutRedirect: msalMocks.logoutRedirect,
    },
    accounts: msalMocks.accounts,
    inProgress: 'none',
  }),
}))

vi.mock('../auth/authConfig', () => ({
  apiTokenRequest: { scopes: ['api://fastapi/access_as_user'] },
}))

describe('AuthenticationControls', () => {
  beforeEach(() => {
    msalMocks.accounts.length = 0
    msalMocks.loginRedirect.mockReset().mockResolvedValue(undefined)
    msalMocks.logoutRedirect.mockReset().mockResolvedValue(undefined)
  })

  it('starts a Microsoft redirect login for an unauthenticated user', async () => {
    render(<AuthenticationControls />)

    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Microsoft' }))

    expect(msalMocks.loginRedirect).toHaveBeenCalledWith({
      scopes: ['api://fastapi/access_as_user'],
    })
  })

  it('shows the signed-in account and starts redirect logout', async () => {
    const account = { name: 'Alex Employee', username: 'alex@example.com' }
    msalMocks.accounts.push(account)
    render(<AuthenticationControls />)

    expect(screen.getByText('Alex Employee')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(msalMocks.logoutRedirect).toHaveBeenCalledWith({
      account,
      postLogoutRedirectUri: window.location.origin,
    })
  })
})
