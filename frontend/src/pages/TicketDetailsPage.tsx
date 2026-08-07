import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTicket, TicketApiError } from '../api/tickets'
import { TicketDetails } from '../components/TicketDetails'
import type { TicketDetailsResponse } from '../types/ticket'

function parseTicketId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null
  }
  const ticketId = Number(value)
  return Number.isSafeInteger(ticketId) && ticketId > 0 ? ticketId : null
}

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

export interface TicketDetailsPageProps {
  backPath?: string
  backLabel?: string
}

export function TicketDetailsPage({
  backPath = '/employee/tickets',
  backLabel = 'Back to my tickets',
}: TicketDetailsPageProps) {
  const { ticketId: routeTicketId } = useParams()
  const ticketId = parseTicketId(routeTicketId)
  const [loadState, setLoadState] = useState<TicketLoadState>(() =>
    initialLoadState(ticketId),
  )
  const currentState =
    loadState.ticketId === ticketId ? loadState : initialLoadState(ticketId)

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
      <Link className="back-link" to={backPath}>← {backLabel}</Link>
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
        currentState.ticket && <TicketDetails ticket={currentState.ticket} />}
    </main>
  )
}
