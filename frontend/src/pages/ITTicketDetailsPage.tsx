import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTicket, TicketApiError } from '../api/tickets'
import { ITTicketActions } from '../components/ITTicketActions'
import { TicketDetails } from '../components/TicketDetails'
import type { TicketDetailsResponse } from '../types/ticket'
import { parseTicketId } from '../utils/ticket'

interface TicketLoadState {
  ticketId: number | null
  ticket: TicketDetailsResponse | null
  isLoading: boolean
  error: string | null
  isNotFound: boolean
}

function initialLoadState(ticketId: number | null): TicketLoadState {
  return {
    ticketId,
    ticket: null,
    isLoading: ticketId !== null,
    error: null,
    isNotFound: ticketId === null,
  }
}

export function ITTicketDetailsPage() {
  const { ticketId: routeTicketId } = useParams()
  const ticketId = parseTicketId(routeTicketId)
  const [loadState, setLoadState] = useState<TicketLoadState>(() =>
    initialLoadState(ticketId),
  )
  const currentState =
    loadState.ticketId === ticketId ? loadState : initialLoadState(ticketId)

  const refreshTicket = useCallback(async () => {
    if (ticketId === null) {
      return
    }

    const loadedTicket = await getTicket(ticketId)    
    setLoadState({
      ticketId,
      ticket: loadedTicket,
      isLoading: false,
      error: null,
      isNotFound: false,
    })
  }, [ticketId])

  useEffect(() => {
    if (ticketId === null) {
      return
    }

    let isCancelled = false

    getTicket(ticketId)
      .then((loadedTicket) => {
        if (!isCancelled) {
          setLoadState({
            ticketId,
            ticket: loadedTicket,
            isLoading: false,
            error: null,
            isNotFound: false,
          })
        }
      })
      .catch((requestError: unknown) => {
        if (!isCancelled) {
          if (requestError instanceof TicketApiError && requestError.status === 404) {
            setLoadState({
              ticketId,
              ticket: null,
              isLoading: false,
              error: null,
              isNotFound: true,
            })
          } else {
            setLoadState({
              ticketId,
              ticket: null,
              isLoading: false,
              error:
                requestError instanceof Error
                  ? requestError.message
                  : 'Could not load ticket details.',
              isNotFound: false,
            })
          }
        }
      })

    return () => {
      isCancelled = true
    }
  }, [ticketId])

  return (
    <main className="page-shell">
      <Link className="back-link" to="/it/tickets">← Back to assigned tickets</Link>
      {currentState.isLoading && <p role="status">Loading ticket details...</p>}
      {!currentState.isLoading && currentState.isNotFound && (
        <section className="empty-state">
          <h1>Ticket not found</h1>
          <p>The requested ticket does not exist.</p>
        </section>
      )}
      {!currentState.isLoading && currentState.error && (
        <div className="alert alert-error" role="alert">
          <strong>Could not load ticket details.</strong> {currentState.error}
        </div>
      )}
      {!currentState.isLoading &&
        !currentState.error &&
        !currentState.isNotFound &&
        currentState.ticket && (
          <>
            <TicketDetails ticket={currentState.ticket} />
            <ITTicketActions
              ticket={currentState.ticket}
              onTicketChanged={refreshTicket}
            />
          </>
        )}
    </main>
  )
}
