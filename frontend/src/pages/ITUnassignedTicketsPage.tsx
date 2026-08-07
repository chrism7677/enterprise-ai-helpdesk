import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUnassignedTickets } from '../api/tickets'
import { TicketList } from '../components/TicketList'
import type { TicketResponse } from '../types/ticket'

export function ITUnassignedTicketsPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState(0)

  const retry = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setRequestNumber((current) => current + 1)
  }, [])

  useEffect(() => {
    let isCancelled = false

    getUnassignedTickets()
      .then((loadedTickets) => {
        if (!isCancelled) {
          setTickets(loadedTickets)
        }
      })
      .catch((requestError: unknown) => {
        if (!isCancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load the unassigned queue.',
          )
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [requestNumber])

  return (
    <main className="page-shell">
      <Link className="back-link" to="/it/tickets">← Back to assigned tickets</Link>
      <header className="page-header">
        <p className="eyebrow">IT staff helpdesk</p>
        <h1>Unassigned ticket queue</h1>
        <p>Review support requests that are waiting for an assignee.</p>
      </header>

      {isLoading && <p role="status">Loading unassigned tickets...</p>}

      {!isLoading && error && (
        <div className="alert alert-error" role="alert">
          <strong>Could not load the unassigned queue.</strong>
          {error !== 'Could not load the unassigned queue.' && ` ${error}`}
          <button className="secondary-button" type="button" onClick={retry}>
            Retry unassigned queue
          </button>
        </div>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <div className="empty-state">
          <p>There are no unassigned tickets.</p>
        </div>
      )}

      {!isLoading && !error && tickets.length > 0 && (
        <TicketList tickets={tickets} basePath="/it/tickets" />
      )}
    </main>
  )
}
