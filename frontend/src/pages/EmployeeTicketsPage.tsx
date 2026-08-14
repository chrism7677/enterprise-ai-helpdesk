import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyTickets } from '../api/tickets'
import { TicketList } from '../components/TicketList'
import type { TicketResponse } from '../types/ticket'

export function EmployeeTicketsPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState(0)

  //Not needed with modern React compilers, but keeping it for now to avoid changing the behavior of the page.
  const retry = useCallback(() => { 
    setIsLoading(true)
    setError(null)
    setRequestNumber((current) => current + 1) //This is only used to trigger another request when Retry is clicked.
  }, [])

  useEffect(() => {
    let isCancelled = false

    getMyTickets()
      .then((loadedTickets) => {
        if (!isCancelled) {
          setTickets(loadedTickets)
        }
      })
      .catch((requestError: unknown) => {
        if (!isCancelled) {
          setError(
            requestError instanceof Error ? requestError.message : null,
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
          <p className="eyebrow">Employee helpdesk</p>
          <h1>My tickets</h1>
          <p>Track the support requests you have submitted.</p>
        </div>
        <Link className="primary-link" to="/employee/tickets/new">Create ticket</Link>
      </header>

      {isLoading && <p role="status">Loading tickets...</p>}

      {!isLoading && error && (
        <div className="alert alert-error" role="alert">
          <strong>Could not load tickets.</strong>
          {error !== 'Could not load tickets.' && ` ${error}`}
          <button className="secondary-button" type="button" onClick={retry}>Retry</button>
        </div>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <div className="empty-state">
          <p>You have not submitted any tickets.</p>
          <Link to="/employee/tickets/new">Create your first ticket</Link>
        </div>
      )}

      {!isLoading && !error && tickets.length > 0 && (
        <TicketList tickets={tickets} basePath="/employee/tickets" />
      )}
    </main>
  )
}
