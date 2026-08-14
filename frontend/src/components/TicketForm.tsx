import { useState, type FormEvent } from 'react'
import type {
  TicketCategory,
  TicketCreateRequest,
  TicketPriority,
  TicketResponse,
} from '../types/ticket'

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: TicketCategory
  label: string
}> = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'network', label: 'Network' },
  { value: 'access', label: 'Account access' },
  { value: 'other', label: 'Other' },
]

const PRIORITY_OPTIONS: ReadonlyArray<{
  value: TicketPriority
  label: string
}> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

interface TicketFormValues {
  title: string
  description: string
  category: TicketCategory | ''
  priority: TicketPriority
}

type TicketFormErrors = Partial<Record<keyof TicketFormValues, string>>

export interface TicketFormProps {
  onSubmit: (ticket: TicketCreateRequest) => Promise<TicketResponse | null>
  isSubmitting: boolean
}

const INITIAL_VALUES: TicketFormValues = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
}

function validate(values: TicketFormValues): TicketFormErrors {
  const errors: TicketFormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Enter a short title.'
  } else if (values.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or fewer.'
  }
  if (!values.description.trim()) {
    errors.description = 'Describe the issue you are experiencing.'
  }
  if (!values.category) {
    errors.category = 'Choose a category.'
  }

  return errors
}

export function TicketForm({ onSubmit, isSubmitting }: TicketFormProps) {
  // Each value comes from React state, making these controlled inputs.
  const [values, setValues] = useState<TicketFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<TicketFormErrors>({})

  function updateValue<Key extends keyof TicketFormValues>(
    key: Key,
    value: TicketFormValues[Key],
  ) {
    // A new object preserves immutable state updates and predictable rendering.
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0 || !values.category) {
      return
    }

    const createdTicket = await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      priority: values.priority,
    })
    if (createdTicket) {
      setValues(INITIAL_VALUES)
    }
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => updateValue('title', event.target.value)}
          aria-describedby={errors.title ? 'title-error' : undefined}
          aria-invalid={Boolean(errors.title)}
          disabled={isSubmitting}
        />
        {errors.title && <p className="field-error" id="title-error">{errors.title}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={6}
          value={values.description}
          onChange={(event) => updateValue('description', event.target.value)}
          aria-describedby={errors.description ? 'description-error' : 'description-help'}
          aria-invalid={Boolean(errors.description)}
          disabled={isSubmitting}
        />
        <p className="field-help" id="description-help">Include what happened and any troubleshooting you tried.</p>
        {errors.description && <p className="field-error" id="description-error">{errors.description}</p>}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={values.category}
            onChange={(event) => updateValue('category', event.target.value as TicketCategory)}
            aria-describedby={errors.category ? 'category-error' : undefined}
            aria-invalid={Boolean(errors.category)}
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.category && <p className="field-error" id="category-error">{errors.category}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={values.priority}
            onChange={(event) => updateValue('priority', event.target.value as TicketPriority)}
            disabled={isSubmitting}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit ticket'}
      </button>
    </form>
  )
}
