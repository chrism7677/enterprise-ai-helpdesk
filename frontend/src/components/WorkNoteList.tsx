import type { WorkNoteResponse } from '../types/ticket'

export interface WorkNoteListProps {
  notes: WorkNoteResponse[]
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function WorkNoteList({ notes }: WorkNoteListProps) {
  if (notes.length === 0) {
    return <p>No work notes have been added.</p>
  }

  return (
    <ol className="work-note-list">
      {notes.map((note) => (
        <li key={note.id}>
          <p>{note.body}</p>
          <p className="note-meta">
            Author ID {note.author_id} · <time dateTime={note.created_at}>{formatDateTime(note.created_at)}</time>
          </p>
        </li>
      ))}
    </ol>
  )
}
