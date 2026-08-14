import { useState } from 'react'
import { claimTicket, resolveTicket } from '../api/tickets'
import type { TicketDetailsResponse } from '../types/ticket'
import { AddWorkNoteForm } from './AddWorkNoteForm'

export interface ITTicketActionsProps {
  ticket: TicketDetailsResponse
  onTicketChanged: () => Promise<void>
}

export function ITTicketActions({
  ticket,
  onTicketChanged,
}: ITTicketActionsProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  async function handleClaim() {
    if (isClaiming) {
      return
    }

    setClaimError(null)
    setIsClaiming(true)
    try {
      await claimTicket(ticket.id)
      await onTicketChanged()
    } catch (requestError: unknown) {
      setClaimError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not claim this ticket.',
      )
    } finally {
      setIsClaiming(false)
    }
  }

  async function handleResolve() {
    if (isResolving) {
      return
    }

    setResolveError(null)
    setIsResolving(true)
    try {
      await resolveTicket(ticket.id)
      await onTicketChanged()
    } catch (requestError: unknown) {
      setResolveError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not resolve this ticket.',
      )
    } finally {
      setIsResolving(false)
    }
  }

  if (ticket.status === 'resolved') {
    return (
      <section className="ticket-actions" aria-labelledby="ticket-actions-heading">
        <h2 id="ticket-actions-heading">Ticket actions</h2>
        <p>This ticket is resolved. No further actions are available.</p>
      </section>
    )
  }

  if (ticket.assignee_id === null) {
    return (
      <section className="ticket-actions" aria-labelledby="ticket-actions-heading">
        <h2 id="ticket-actions-heading">Ticket actions</h2>
        {claimError && (
          <div className="alert alert-error" role="alert">
            <strong>Could not claim this ticket.</strong>
            {claimError !== 'Could not claim this ticket.' && ` ${claimError}`}
          </div>
        )}
        <button
          className="submit-button"
          type="button"
          disabled={isClaiming}
          onClick={handleClaim}
        >
          {isClaiming ? 'Claiming...' : 'Claim ticket'}
        </button>
      </section>
    )
  }

  if (!ticket.assigned_to_current_user) {
    return (
      <section className="ticket-actions" aria-labelledby="ticket-actions-heading">
        <h2 id="ticket-actions-heading">Ticket actions</h2>
        <p>This ticket is assigned to another IT staff member.</p>
      </section>
    )
  }

  return (
    <section className="ticket-actions" aria-labelledby="ticket-actions-heading">
      <h2 id="ticket-actions-heading">Ticket actions</h2>
      <AddWorkNoteForm
        ticketId={ticket.id}
        onNoteCreated={onTicketChanged}
      />
      <div className="resolve-action">
        {resolveError && (
          <div className="alert alert-error" role="alert">
            <strong>Could not resolve this ticket.</strong>
            {resolveError !== 'Could not resolve this ticket.' && ` ${resolveError}`}
          </div>
        )}
        <button
          className="secondary-button"
          type="button"
          disabled={isResolving}
          onClick={handleResolve}
        >
          {isResolving ? 'Resolving...' : 'Resolve ticket'}
        </button>
      </div>
    </section>
  )
}
