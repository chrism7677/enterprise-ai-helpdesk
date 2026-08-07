import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTicketsByAssignee } from '../api/tickets'
import { TicketList } from '../components/TicketList'
import { DEMO_IT_STAFF_ID } from '../config'
import type { TicketResponse } from '../types/ticket'

export function ITTicketsPage() {
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

    getTicketsByAssignee(DEMO_IT_STAFF_ID)
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
              : 'Could not load assigned tickets.',
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
      <header className="page-header page-header-with-action">
        <div>
          <p className="eyebrow">IT staff helpdesk</p>
          <h1>My assigned tickets</h1>
          <p>Review the support requests assigned to you.</p>
        </div>
        <Link className="primary-link" to="/it/tickets/unassigned">
          View unassigned queue
        </Link>
      </header>

      {isLoading && <p role="status">Loading assigned tickets...</p>}

      {!isLoading && error && (
        <div className="alert alert-error" role="alert">
          <strong>Could not load assigned tickets.</strong>
          {error !== 'Could not load assigned tickets.' && ` ${error}`}
          <button className="secondary-button" type="button" onClick={retry}>
            Retry assigned tickets
          </button>
        </div>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <div className="empty-state">
          <p>You do not have any assigned tickets.</p>
          <Link to="/it/tickets/unassigned">View unassigned queue</Link>
        </div>
      )}

      {!isLoading && !error && tickets.length > 0 && (
        <TicketList tickets={tickets} basePath="/it/tickets" />
      )}
    </main>
  )
}
