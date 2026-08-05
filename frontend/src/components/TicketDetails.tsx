import type { TicketDetailsResponse } from '../types/ticket'
import { TicketStatusBadge } from './TicketStatusBadge'
import { WorkNoteList } from './WorkNoteList'

export interface TicketDetailsProps {
  ticket: TicketDetailsResponse
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <article className="ticket-details">
      <div className="details-heading">
        <div>
          <p className="ticket-number">Ticket #{ticket.id}</p>
          <h1>{ticket.title}</h1>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <section aria-labelledby="description-heading">
        <h2 id="description-heading">Description</h2>
        <p className="ticket-description">{ticket.description}</p>
      </section>

      <dl className="details-grid">
        <div><dt>Category</dt><dd>{ticket.category}</dd></div>
        <div><dt>Priority</dt><dd>{ticket.priority}</dd></div>
        <div><dt>Requester ID</dt><dd>{ticket.requester_id}</dd></div>
        <div><dt>Assignee</dt><dd>{ticket.assignee_id ?? 'Unassigned'}</dd></div>
        <div><dt>Created</dt><dd><time dateTime={ticket.created_at}>{formatDateTime(ticket.created_at)}</time></dd></div>
        <div><dt>Last updated</dt><dd><time dateTime={ticket.updated_at}>{formatDateTime(ticket.updated_at)}</time></dd></div>
      </dl>

      <section aria-labelledby="work-notes-heading">
        <h2 id="work-notes-heading">Work notes</h2>
        <WorkNoteList notes={ticket.notes} />
      </section>
    </article>
  )
}
