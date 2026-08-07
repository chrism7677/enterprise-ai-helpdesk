import { Link } from 'react-router-dom'
import type { TicketResponse } from '../types/ticket'
import { TicketStatusBadge } from './TicketStatusBadge'

export interface TicketListProps {
  tickets: TicketResponse[]
  basePath: string
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(date),
  )
}

export function TicketList({ tickets, basePath }: TicketListProps) {
  return (
    <ul className="ticket-list">
      {tickets.map((ticket) => (
        <li className="ticket-list-item" key={ticket.id}>
          <div className="ticket-list-heading">
            <div>
              <p className="ticket-number">Ticket #{ticket.id}</p>
              <h2>
                <Link to={`${basePath}/${ticket.id}`}>{ticket.title}</Link>
              </h2>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <dl className="ticket-summary">
            <div><dt>Priority</dt><dd>{ticket.priority}</dd></div>
            <div><dt>Category</dt><dd>{ticket.category}</dd></div>
            <div><dt>Created</dt><dd>{formatDate(ticket.created_at)}</dd></div>
          </dl>
        </li>
      ))}
    </ul>
  )
}
