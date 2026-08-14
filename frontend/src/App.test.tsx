import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createTicket } from './api/tickets'
import type { TicketResponse } from './types/ticket'

vi.mock('./api/tickets', () => ({ createTicket: vi.fn() }))

const mockedCreateTicket = vi.mocked(createTicket)

const createdTicket: TicketResponse = {
  id: 42,
  title: 'VPN unavailable',
  description: 'The VPN client times out.',
  category: 'network',
  priority: 'high',
  status: 'open',
  requester_id: 1,
  assignee_id: null,
  created_at: '2026-08-03T12:00:00Z',
  updated_at: '2026-08-03T12:00:00Z',
}

async function completeForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Title'), 'VPN unavailable')
  await user.type(screen.getByLabelText('Description'), 'The VPN client times out.')
  await user.selectOptions(screen.getByLabelText('Category'), 'network')
  await user.selectOptions(screen.getByLabelText('Priority'), 'high')
  return user
}

describe('employee ticket creation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/employee/tickets/new')
    mockedCreateTicket.mockReset()
  })

  it('renders the ticket form and updates controlled inputs', async () => {
    render(<App />)
    const user = userEvent.setup()
    const title = screen.getByLabelText('Title')

    expect(screen.getByRole('heading', { name: 'Create a support ticket' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit ticket' })).toBeEnabled()

    await user.type(title, 'Laptop will not start')
    expect(title).toHaveValue('Laptop will not start')
  })

  it('displays validation errors for an invalid submission', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Submit ticket' }))

    expect(screen.getByText('Enter a short title.')).toBeInTheDocument()
    expect(screen.getByText('Describe the issue you are experiencing.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(mockedCreateTicket).not.toHaveBeenCalled()
  })

  it('sends the expected payload and displays the successful result', async () => {
    mockedCreateTicket.mockResolvedValue(createdTicket)
    render(<App />)
    const user = await completeForm()

    await user.click(screen.getByRole('button', { name: 'Submit ticket' }))

    expect(mockedCreateTicket).toHaveBeenCalledWith({
      title: 'VPN unavailable',
      description: 'The VPN client times out.',
      category: 'network',
      priority: 'high',
    })
    expect(await screen.findByText(/Ticket #42 is open/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('displays an API error and preserves form values', async () => {
    mockedCreateTicket.mockRejectedValue(new Error('Requester not found'))
    render(<App />)
    const user = await completeForm()

    await user.click(screen.getByRole('button', { name: 'Submit ticket' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Requester not found')
    expect(screen.getByLabelText('Title')).toHaveValue('VPN unavailable')
  })
})
