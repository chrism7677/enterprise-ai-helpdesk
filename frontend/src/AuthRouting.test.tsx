import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { ApplicationAuthState } from './auth/ApplicationAuthContext'

let authState: ApplicationAuthState

vi.mock('./auth/ApplicationAuthContext', () => ({
  useApplicationAuth: () => authState,
}))

vi.mock('./pages/EmployeeTicketsPage', () => ({
  EmployeeTicketsPage: () => <h1>Employee tickets page</h1>,
}))
vi.mock('./pages/CreateTicketPage', () => ({
  CreateTicketPage: () => <h1>Create ticket page</h1>,
}))
vi.mock('./pages/TicketDetailsPage', () => ({
  TicketDetailsPage: () => <h1>Employee ticket details page</h1>,
}))
vi.mock('./pages/ITTicketsPage', () => ({
  ITTicketsPage: () => <h1>IT tickets page</h1>,
}))
vi.mock('./pages/ITUnassignedTicketsPage', () => ({
  ITUnassignedTicketsPage: () => <h1>IT unassigned queue page</h1>,
}))
vi.mock('./pages/ITTicketDetailsPage', () => ({
  ITTicketDetailsPage: () => <h1>IT ticket details page</h1>,
}))

const employeeState: ApplicationAuthState = {
  status: 'authenticated',
  currentUser: {
    id: 1,
    name: 'Demo Employee',
    email: 'employee@example.com',
    role: 'employee',
  },
}

const itStaffState: ApplicationAuthState = {
  status: 'authenticated',
  currentUser: {
    id: 2,
    name: 'Demo IT Staff',
    email: 'it.staff@example.com',
    role: 'it_staff',
  },
}

describe('protected and role-aware routing', () => {
  beforeEach(() => {
    authState = { status: 'loading', currentUser: null }
  })

  it.each(['/employee/tickets', '/it/tickets'])(
    'redirects an unauthenticated user away from %s',
    async (path) => {
      authState = { status: 'unauthenticated', currentUser: null }
      window.history.replaceState({}, '', path)

      render(<App />)

      expect(
        await screen.findByRole('heading', { name: 'Sign in to continue' }),
      ).toBeInTheDocument()
      expect(window.location.pathname).toBe('/')
      expect(screen.queryByText('Employee tickets page')).not.toBeInTheDocument()
      expect(screen.queryByText('IT tickets page')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Live demo access' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Employee demo identity' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'IT Staff demo identity' })).toBeInTheDocument()
      expect(
        screen.getByText(
          /Do not enter real personal, confidential, or sensitive information/,
        ),
      ).toBeInTheDocument()
    },
  )

  it('allows an employee to access employee routes and navigation', () => {
    authState = employeeState
    window.history.replaceState({}, '', '/employee/tickets')

    render(<App />)

    expect(screen.getByText('Employee tickets page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Assigned Tickets' })).not.toBeInTheDocument()
  })

  it('redirects an employee away from IT routes', async () => {
    authState = employeeState
    window.history.replaceState({}, '', '/it/tickets')

    render(<App />)

    await waitFor(() => expect(window.location.pathname).toBe('/employee/tickets'))
    expect(screen.getByText('Employee tickets page')).toBeInTheDocument()
    expect(screen.queryByText('IT tickets page')).not.toBeInTheDocument()
  })

  it('allows IT staff to access IT routes and navigation', () => {
    authState = itStaffState
    window.history.replaceState({}, '', '/it/tickets')

    render(<App />)

    expect(screen.getByText('IT tickets page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Assigned Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Unassigned Queue' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create Ticket' })).not.toBeInTheDocument()
  })

  it('redirects IT staff away from employee-only routes', async () => {
    authState = itStaffState
    window.history.replaceState({}, '', '/employee/tickets/new')

    render(<App />)

    await waitFor(() => expect(window.location.pathname).toBe('/it/tickets'))
    expect(screen.getByText('IT tickets page')).toBeInTheDocument()
    expect(screen.queryByText('Create ticket page')).not.toBeInTheDocument()
  })

  it.each([
    [employeeState, '/employee/tickets', 'Employee tickets page'],
    [itStaffState, '/it/tickets', 'IT tickets page'],
  ] as const)(
    'routes an authenticated user from the root to the role home',
    async (state, expectedPath, expectedPage) => {
      authState = state
      window.history.replaceState({}, '', '/')

      render(<App />)

      await waitFor(() => expect(window.location.pathname).toBe(expectedPath))
      expect(screen.getByText(expectedPage)).toBeInTheDocument()
    },
  )

  it('shows access denied for an authenticated but unmapped user', () => {
    authState = { status: 'unmapped', currentUser: null }
    window.history.replaceState({}, '', '/it/tickets')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    expect(screen.getByText(/not registered for this helpdesk/)).toBeInTheDocument()
    expect(screen.queryByText('IT tickets page')).not.toBeInTheDocument()
  })

  it('shows only the access loading state while role resolution is pending', () => {
    window.history.replaceState({}, '', '/employee/tickets/new')

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your helpdesk access...',
    )
    expect(screen.queryByText('Create ticket page')).not.toBeInTheDocument()
  })
})
