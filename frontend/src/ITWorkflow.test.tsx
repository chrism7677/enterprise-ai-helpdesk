import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  getTicket,
  getTicketsByAssignee,
  getUnassignedTickets,
} from './api/tickets'
import type { TicketDetailsResponse, TicketResponse } from './types/ticket'

vi.mock('./api/tickets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/tickets')>()
  return {
    ...actual,
    getTicket: vi.fn(),
    getTicketsByAssignee: vi.fn(),
    getUnassignedTickets: vi.fn(),
  }
})

const mockedGetTicket = vi.mocked(getTicket)
const mockedGetAssignedTickets = vi.mocked(getTicketsByAssignee)
const mockedGetUnassignedTickets = vi.mocked(getUnassignedTickets)

const assignedTicket: TicketResponse = {
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

const unassignedTicket: TicketResponse = {
  ...assignedTicket,
  id: 8,
  title: 'Laptop will not start',
  status: 'open',
  assignee_id: null,
}

const ticketWithNotes: TicketDetailsResponse = {
  ...assignedTicket,
  notes: [
    {
      id: 10,
      ticket_id: 7,
      author_id: 2,
      body: 'Rebuilt the local mail profile.',
      created_at: '2026-08-02T14:00:00Z',
    },
  ],
}

function resetMocks() {
  mockedGetTicket.mockReset()
  mockedGetAssignedTickets.mockReset()
  mockedGetUnassignedTickets.mockReset()
}

describe('IT assigned tickets', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/it/tickets')
    resetMocks()
  })

  it('requests demo IT staff user 2 and displays loading', () => {
    mockedGetAssignedTickets.mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading assigned tickets...',
    )
    expect(mockedGetAssignedTickets).toHaveBeenCalledWith(2)
  })

  it('renders assigned tickets with IT details links', async () => {
    mockedGetAssignedTickets.mockResolvedValue([assignedTicket])
    render(<App />)

    const ticketLink = await screen.findByRole('link', {
      name: assignedTicket.title,
    })
    expect(ticketLink).toHaveAttribute('href', '/it/tickets/7')
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('displays the empty state and unassigned queue link', async () => {
    mockedGetAssignedTickets.mockResolvedValue([])
    render(<App />)

    expect(
      await screen.findByText('You do not have any assigned tickets.'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'View unassigned queue' })[0],
    ).toHaveAttribute('href', '/it/tickets/unassigned')
  })

  it('displays an API error and retries the request', async () => {
    mockedGetAssignedTickets
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce([assignedTicket])
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load assigned tickets. Service unavailable',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry assigned tickets' }),
    )

    expect(
      await screen.findByRole('link', { name: assignedTicket.title }),
    ).toBeInTheDocument()
    expect(mockedGetAssignedTickets).toHaveBeenCalledTimes(2)
  })
})

describe('IT unassigned ticket queue', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/it/tickets/unassigned')
    resetMocks()
  })

  it('renders unassigned tickets with IT details links', async () => {
    mockedGetUnassignedTickets.mockResolvedValue([unassignedTicket])
    render(<App />)

    expect(mockedGetUnassignedTickets).toHaveBeenCalledOnce()
    expect(
      await screen.findByRole('link', { name: unassignedTicket.title }),
    ).toHaveAttribute('href', '/it/tickets/8')
  })

  it('displays the empty state', async () => {
    mockedGetUnassignedTickets.mockResolvedValue([])
    render(<App />)

    expect(
      await screen.findByText('There are no unassigned tickets.'),
    ).toBeInTheDocument()
  })

  it('displays loading and a queue navigation link', () => {
    mockedGetUnassignedTickets.mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading unassigned tickets...',
    )
    expect(
      screen.getByRole('link', { name: /Back to assigned tickets/ }),
    ).toHaveAttribute('href', '/it/tickets')
  })

  it('displays an API error and retry control', async () => {
    mockedGetUnassignedTickets.mockRejectedValue(new Error('Service unavailable'))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the unassigned queue. Service unavailable',
    )
    expect(
      screen.getByRole('button', { name: 'Retry unassigned queue' }),
    ).toBeInTheDocument()
  })
})

describe('IT ticket details', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/it/tickets/7')
    resetMocks()
  })

  it('renders ticket information and work-note history', async () => {
    mockedGetTicket.mockResolvedValue(ticketWithNotes)
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: assignedTicket.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(assignedTicket.description)).toBeInTheDocument()
    expect(screen.getByText('Requester ID').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Assignee').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Rebuilt the local mail profile.')).toBeInTheDocument()
    expect(mockedGetTicket).toHaveBeenCalledWith(7)
  })

  it('renders the empty work-note state and unassigned value', async () => {
    mockedGetTicket.mockResolvedValue({
      ...ticketWithNotes,
      assignee_id: null,
      notes: [],
    })
    render(<App />)

    expect(
      await screen.findByText('No work notes have been added.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('displays loading while ticket details are requested', () => {
    mockedGetTicket.mockReturnValue(new Promise(() => {}))
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading ticket details...',
    )
  })

  it('displays an API error', async () => {
    mockedGetTicket.mockRejectedValue(new Error('Service unavailable'))
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load ticket details. Service unavailable',
    )
  })

  it('does not request an invalid ticket ID', async () => {
    window.history.replaceState({}, '', '/it/tickets/not-a-number')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Ticket not found' }),
    ).toBeInTheDocument()
    expect(mockedGetTicket).not.toHaveBeenCalled()
  })
})
