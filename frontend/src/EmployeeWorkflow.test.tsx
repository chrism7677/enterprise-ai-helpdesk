import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getMyTickets, getTicket, TicketApiError } from './api/tickets'
import type { TicketDetailsResponse, TicketResponse } from './types/ticket'

vi.mock('./api/tickets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/tickets')>()
  return {
    ...actual,
    createTicket: vi.fn(),
    getTicket: vi.fn(),
    getMyTickets: vi.fn(),
  }
})

const mockedGetTicket = vi.mocked(getTicket)
const mockedGetTickets = vi.mocked(getMyTickets)

const ticket: TicketResponse = {
  id: 7,
  title: 'Email will not synchronize',
  description: 'New messages do not appear in the desktop application.',
  category: 'software',
  priority: 'medium',
  status: 'in_progress',
  requester_id: 1,
  assignee_id: 2,
  created_at: '2026-08-01T13:30:00Z',
  updated_at: '2026-08-02T15:00:00Z',
}

const ticketWithNotes: TicketDetailsResponse = {
  ...ticket,
  assigned_to_current_user: false,
  notes: [
    {
      id: 10,
      ticket_id: 7,
      author_id: 2,
      body: 'Rebuilt the local mail profile.',
      created_at: '2026-08-02T14:00:00Z',
    },
    {
      id: 11,
      ticket_id: 7,
      author_id: 2,
      body: 'Synchronization resumed successfully.',
      created_at: '2026-08-02T15:00:00Z',
    },
  ],
}

describe('employee ticket list', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/employee/tickets')
    mockedGetTicket.mockReset()
    mockedGetTickets.mockReset()
  })

  it('displays loading while tickets are requested', () => {
    mockedGetTickets.mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading tickets...')
    expect(mockedGetTickets).toHaveBeenCalledWith()
  })

  it('renders tickets returned by the API', async () => {
    mockedGetTickets.mockResolvedValue([ticket])
    render(<App />)

    expect(await screen.findByRole('link', { name: ticket.title })).toBeInTheDocument()
    expect(screen.getByText('Ticket #7')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('software')).toBeInTheDocument()
  })

  it('displays the empty state with a creation link', async () => {
    mockedGetTickets.mockResolvedValue([])
    render(<App />)

    expect(await screen.findByText('You have not submitted any tickets.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first ticket' })).toHaveAttribute(
      'href',
      '/employee/tickets/new',
    )
  })

  it('displays an API error and retry control', async () => {
    mockedGetTickets.mockRejectedValue(new Error('Service unavailable'))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load tickets. Service unavailable',
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('navigates from a ticket link to its details route', async () => {
    mockedGetTickets.mockResolvedValue([ticket])
    mockedGetTicket.mockResolvedValue(ticketWithNotes)
    render(<App />)

    await userEvent.click(await screen.findByRole('link', { name: ticket.title }))

    expect(window.location.pathname).toBe('/employee/tickets/7')
    expect(await screen.findByRole('heading', { name: ticket.title })).toBeInTheDocument()
    expect(mockedGetTicket).toHaveBeenCalledWith(7)
  })
})

describe('employee ticket details', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/employee/tickets/7')
    mockedGetTicket.mockReset()
    mockedGetTickets.mockReset()
  })

  it('displays ticket information and work-note history', async () => {
    mockedGetTicket.mockResolvedValue(ticketWithNotes)
    render(<App />)

    expect(await screen.findByRole('heading', { name: ticket.title })).toBeInTheDocument()
    expect(screen.getByText(ticket.description)).toBeInTheDocument()
    expect(screen.getByText('Requester ID').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Assignee').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Rebuilt the local mail profile.')).toBeInTheDocument()
    expect(screen.getByText('Synchronization resumed successfully.')).toBeInTheDocument()
  })

  it('displays the empty work-note state for an unassigned ticket', async () => {
    mockedGetTicket.mockResolvedValue({
      ...ticketWithNotes,
      status: 'open',
      assignee_id: null,
      notes: [],
    })
    render(<App />)

    expect(await screen.findByText('No work notes have been added.')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('displays a not-found state for a missing ticket', async () => {
    mockedGetTicket.mockRejectedValue(new TicketApiError('Ticket not found', 404))
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ticket not found' })).toBeInTheDocument()
  })

  it('rejects an invalid route ID without requesting the API', async () => {
    window.history.replaceState({}, '', '/employee/tickets/not-a-number')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ticket not found' })).toBeInTheDocument()
    expect(mockedGetTicket).not.toHaveBeenCalled()
  })
})
