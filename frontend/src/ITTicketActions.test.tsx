import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  claimTicket,
  createTicketNote,
  getTicket,
  resolveTicket,
} from './api/tickets'
import type {
  TicketDetailsResponse,
  TicketResponse,
  WorkNoteResponse,
} from './types/ticket'

vi.mock('./api/tickets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/tickets')>()
  return {
    ...actual,
    claimTicket: vi.fn(),
    createTicketNote: vi.fn(),
    getTicket: vi.fn(),
    resolveTicket: vi.fn(),
  }
})
vi.mock('./auth/ApplicationAuthContext', () => ({
  useApplicationAuth: () => ({
    status: 'authenticated',
    currentUser: {
      id: 2,
      name: 'Demo IT Staff',
      email: 'it.staff@example.com',
      role: 'it_staff',
    },
  }),
}))

const mockedClaimTicket = vi.mocked(claimTicket)
const mockedCreateTicketNote = vi.mocked(createTicketNote)
const mockedGetTicket = vi.mocked(getTicket)
const mockedResolveTicket = vi.mocked(resolveTicket)

const assignedTicket: TicketDetailsResponse = {
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
  notes: [],
  assigned_to_current_user: true,
}

const unassignedTicket: TicketDetailsResponse = {
  ...assignedTicket,
  status: 'open',
  assignee_id: null,
}

const otherUserTicket: TicketDetailsResponse = {
  ...assignedTicket,
  assignee_id: 3,
  assigned_to_current_user: false,
}

const resolvedTicket: TicketDetailsResponse = {
  ...assignedTicket,
  status: 'resolved',
  notes: [
    {
      id: 10,
      ticket_id: 7,
      author_id: 2,
      body: 'Confirmed the mailbox is synchronized.',
      created_at: '2026-08-02T14:00:00Z',
    },
  ],
}

const claimResponse: TicketResponse = {
  ...assignedTicket,
}

const createdNote: WorkNoteResponse = {
  id: 11,
  ticket_id: 7,
  author_id: 2,
  body: 'Rebuilt the local mail profile.',
  created_at: '2026-08-02T15:30:00Z',
}

function deferredPromise<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

describe('IT ticket claim action', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/it/tickets/7')
    mockedClaimTicket.mockReset()
    mockedCreateTicketNote.mockReset()
    mockedGetTicket.mockReset()
    mockedResolveTicket.mockReset()
  })

  it('shows Claim only for an unassigned open ticket', async () => {
    mockedGetTicket.mockResolvedValue(unassignedTicket)
    render(<App />)

    expect(
      await screen.findByRole('button', { name: 'Claim ticket' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Add work note')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Resolve ticket' }),
    ).not.toBeInTheDocument()
  })

  it('claims as the authenticated IT user and refreshes after success', async () => {
    mockedGetTicket
      .mockResolvedValueOnce(unassignedTicket)
      .mockResolvedValueOnce(assignedTicket)
    mockedClaimTicket.mockResolvedValue(claimResponse)
    render(<App />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Claim ticket' }),
    )

    expect(mockedClaimTicket).toHaveBeenCalledWith(7)
    expect(await screen.findByLabelText('Add work note')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Resolve ticket' }),
    ).toBeInTheDocument()
    expect(mockedGetTicket).toHaveBeenCalledTimes(2)
    expect(
      screen.queryByRole('button', { name: 'Claim ticket' }),
    ).not.toBeInTheDocument()
  })

  it('shows a disabled submitting state and prevents duplicate claims', async () => {
    const pendingClaim = deferredPromise<TicketResponse>()
    mockedGetTicket.mockResolvedValue(unassignedTicket)
    mockedClaimTicket.mockReturnValue(pendingClaim.promise)
    render(<App />)

    const claimButton = await screen.findByRole('button', { name: 'Claim ticket' })
    await userEvent.dblClick(claimButton)

    expect(screen.getByRole('button', { name: 'Claiming...' })).toBeDisabled()
    expect(mockedClaimTicket).toHaveBeenCalledOnce()
  })

  it('keeps the ticket visible and reports a claim failure', async () => {
    mockedGetTicket.mockResolvedValue(unassignedTicket)
    mockedClaimTicket.mockRejectedValue(new Error('Ticket was claimed elsewhere'))
    render(<App />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Claim ticket' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not claim this ticket. Ticket was claimed elsewhere',
    )
    expect(screen.getByRole('heading', { name: unassignedTicket.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claim ticket' })).toBeEnabled()
  })

  it('does not show Claim for a ticket that is already assigned', async () => {
    mockedGetTicket.mockResolvedValue(assignedTicket)
    render(<App />)

    expect(await screen.findByLabelText('Add work note')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Claim ticket' }),
    ).not.toBeInTheDocument()
  })
})

describe('IT work-note action', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/it/tickets/7')
    mockedClaimTicket.mockReset()
    mockedCreateTicketNote.mockReset()
    mockedGetTicket.mockReset()
    mockedResolveTicket.mockReset()
    mockedGetTicket.mockResolvedValue(assignedTicket)
  })

  it('shows the note form for a ticket assigned to the current IT user', async () => {
    render(<App />)

    expect(await screen.findByLabelText('Add work note')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add work note' }),
    ).toBeInTheDocument()
  })

  it('rejects a whitespace-only note without calling the API', async () => {
    render(<App />)

    await userEvent.type(await screen.findByLabelText('Add work note'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Add work note' }))

    expect(screen.getByText('Enter a work note.')).toBeInTheDocument()
    expect(mockedCreateTicketNote).not.toHaveBeenCalled()
  })

  it('submits a trimmed note without an author ID', async () => {
    mockedCreateTicketNote.mockResolvedValue(createdNote)
    render(<App />)

    await userEvent.type(
      await screen.findByLabelText('Add work note'),
      '  Rebuilt the local mail profile.  ',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add work note' }))

    await waitFor(() => {
      expect(mockedCreateTicketNote).toHaveBeenCalledWith(
        7,
        'Rebuilt the local mail profile.',
      )
    })
  })

  it('shows a disabled submitting state and prevents duplicate notes', async () => {
    const pendingNote = deferredPromise<WorkNoteResponse>()
    mockedCreateTicketNote.mockReturnValue(pendingNote.promise)
    render(<App />)

    await userEvent.type(await screen.findByLabelText('Add work note'), 'Investigating')
    const addButton = screen.getByRole('button', { name: 'Add work note' })
    await userEvent.dblClick(addButton)

    expect(screen.getByRole('button', { name: 'Adding note...' })).toBeDisabled()
    expect(mockedCreateTicketNote).toHaveBeenCalledOnce()
  })

  it('clears the note, refreshes details, and displays the returned history', async () => {
    const refreshedTicket = { ...assignedTicket, notes: [createdNote] }
    mockedGetTicket
      .mockResolvedValueOnce(assignedTicket)
      .mockResolvedValueOnce(refreshedTicket)
    mockedCreateTicketNote.mockResolvedValue(createdNote)
    render(<App />)

    const noteInput = await screen.findByLabelText('Add work note')
    await userEvent.type(noteInput, createdNote.body)
    await userEvent.click(screen.getByRole('button', { name: 'Add work note' }))

    expect(await screen.findByText(createdNote.body)).toBeInTheDocument()
    expect(noteInput).toHaveValue('')
    expect(mockedGetTicket).toHaveBeenCalledTimes(2)
  })

  it('preserves the note body and displays a note-specific API error', async () => {
    mockedCreateTicketNote.mockRejectedValue(new Error('Note service unavailable'))
    render(<App />)

    const noteInput = await screen.findByLabelText('Add work note')
    await userEvent.type(noteInput, 'Keep this diagnostic note')
    await userEvent.click(screen.getByRole('button', { name: 'Add work note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not add the work note. Note service unavailable',
    )
    expect(noteInput).toHaveValue('Keep this diagnostic note')
  })
})

describe('IT ticket resolve and ownership actions', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/it/tickets/7')
    mockedClaimTicket.mockReset()
    mockedCreateTicketNote.mockReset()
    mockedGetTicket.mockReset()
    mockedResolveTicket.mockReset()
  })

  it('shows Resolve for a ticket assigned to the current IT user', async () => {
    mockedGetTicket.mockResolvedValue(assignedTicket)
    render(<App />)

    expect(
      await screen.findByRole('button', { name: 'Resolve ticket' }),
    ).toBeInTheDocument()
  })

  it('calls Resolve and refreshes into a read-only resolved state', async () => {
    mockedGetTicket
      .mockResolvedValueOnce(assignedTicket)
      .mockResolvedValueOnce(resolvedTicket)
    mockedResolveTicket.mockResolvedValue(resolvedTicket)
    render(<App />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Resolve ticket' }),
    )

    expect(mockedResolveTicket).toHaveBeenCalledWith(7)
    expect(
      await screen.findByText('This ticket is resolved. No further actions are available.'),
    ).toBeInTheDocument()
    expect(mockedGetTicket).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Confirmed the mailbox is synchronized.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Add work note')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Resolve ticket' }),
    ).not.toBeInTheDocument()
  })

  it('shows a disabled resolving state and prevents duplicate requests', async () => {
    const pendingResolve = deferredPromise<TicketResponse>()
    mockedGetTicket.mockResolvedValue(assignedTicket)
    mockedResolveTicket.mockReturnValue(pendingResolve.promise)
    render(<App />)

    const resolveButton = await screen.findByRole('button', {
      name: 'Resolve ticket',
    })
    await userEvent.dblClick(resolveButton)

    expect(screen.getByRole('button', { name: 'Resolving...' })).toBeDisabled()
    expect(mockedResolveTicket).toHaveBeenCalledOnce()
  })

  it('keeps ticket details visible and displays a resolve-specific error', async () => {
    mockedGetTicket.mockResolvedValue(assignedTicket)
    mockedResolveTicket.mockRejectedValue(new Error('Resolve service unavailable'))
    render(<App />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Resolve ticket' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not resolve this ticket. Resolve service unavailable',
    )
    expect(screen.getByRole('heading', { name: assignedTicket.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resolve ticket' })).toBeEnabled()
  })

  it('hides mutations for another user and explains the read-only state', async () => {
    mockedGetTicket.mockResolvedValue(otherUserTicket)
    render(<App />)

    expect(
      await screen.findByText('This ticket is assigned to another IT staff member.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Add work note')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps notes visible but hides mutations for an already resolved ticket', async () => {
    mockedGetTicket.mockResolvedValue(resolvedTicket)
    render(<App />)

    expect(
      await screen.findByText('This ticket is resolved. No further actions are available.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Confirmed the mailbox is synchronized.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Add work note')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
