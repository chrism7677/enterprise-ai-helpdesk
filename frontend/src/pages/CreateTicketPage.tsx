import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createTicket } from '../api/tickets'
import { TicketForm } from '../components/TicketForm'
import type { TicketCreateRequest, TicketResponse } from '../types/ticket'

export function CreateTicketPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [createdTicket, setCreatedTicket] = useState<TicketResponse | null>(null)

  async function handleCreateTicket(
    ticket: TicketCreateRequest,
  ): Promise<TicketResponse | null> {
    setIsSubmitting(true)
    setApiError(null)
    setCreatedTicket(null)

    try {
      const created = await createTicket(ticket)
      setCreatedTicket(created)
      return created
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'We could not create your ticket. Please try again.',
      )
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell">
      <Link className="back-link" to="/employee/tickets">← Back to my tickets</Link>
      <header className="page-header">
        <p className="eyebrow">Employee helpdesk</p>
        <h1>Create a support ticket</h1>
        <p>Tell the IT team what you need help with.</p>
      </header>

      {apiError && (
        <div className="alert alert-error" role="alert">
          <strong>Ticket not submitted.</strong> {apiError}
        </div>
      )}

      {createdTicket && (
        <div className="alert alert-success" role="status">
          <strong>Ticket created successfully.</strong>
          <span> Ticket #{createdTicket.id} is {createdTicket.status.replace('_', ' ')}.</span>
          {' '}
          <Link to={`/employee/tickets/${createdTicket.id}`}>View ticket details</Link>
        </div>
      )}

      <section className="form-card" aria-labelledby="ticket-form-heading">
        <h2 id="ticket-form-heading">Issue details</h2>
        <TicketForm onSubmit={handleCreateTicket} isSubmitting={isSubmitting} />
      </section>
    </main>
  )
}
