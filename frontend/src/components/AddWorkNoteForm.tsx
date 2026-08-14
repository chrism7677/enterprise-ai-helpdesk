import { useState, type FormEvent } from 'react'
import { createTicketNote } from '../api/tickets'

export interface AddWorkNoteFormProps {
  ticketId: number
  onNoteCreated: () => Promise<void>
}

export function AddWorkNoteForm({
  ticketId,
  onNoteCreated,
}: AddWorkNoteFormProps) {
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const trimmedBody = body.trim()
    if (!trimmedBody) {
      setValidationError('Enter a work note.')
      return
    }

    setValidationError(null)
    setApiError(null)
    setIsSubmitting(true)

    try {
      await createTicketNote(ticketId, trimmedBody)
      await onNoteCreated()
      setBody('')
    } catch (requestError: unknown) {
      setApiError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not add the work note.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="work-note-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="work-note-body">Add work note</label>
        <textarea
          id="work-note-body"
          rows={4}
          value={body}
          disabled={isSubmitting}
          aria-invalid={validationError ? 'true' : undefined}
          aria-describedby={validationError ? 'work-note-error' : undefined}
          onChange={(event) => {
            setBody(event.target.value)
            setValidationError(null)
          }}
        />
        {validationError && (
          <span className="field-error" id="work-note-error">
            {validationError}
          </span>
        )}
      </div>

      {apiError && (
        <div className="alert alert-error" role="alert">
          <strong>Could not add the work note.</strong>
          {apiError !== 'Could not add the work note.' && ` ${apiError}`}
        </div>
      )}

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding note...' : 'Add work note'}
      </button>
    </form>
  )
}
