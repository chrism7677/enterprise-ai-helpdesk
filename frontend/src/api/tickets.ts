import { API_BASE_URL } from '../config'
import type { TicketCreateRequest, TicketResponse } from '../types/ticket'

interface ApiErrorBody {
  detail?: string
}

export class TicketApiError extends Error {
  readonly status: number

  constructor(
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'TicketApiError'
    this.status = status
  }
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody
    if (typeof body.detail === 'string') {
      return body.detail
    }
  } catch {
    // The server may return an empty or non-JSON error response.
  }

  return 'We could not create your ticket. Please try again.'
}

// Keeping HTTP details here lets components focus on form and rendering state.
export async function createTicket(
  ticket: TicketCreateRequest,
): Promise<TicketResponse> {
  const response = await fetch(`${API_BASE_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket),
  })

  if (!response.ok) {
    throw new TicketApiError(await getErrorMessage(response), response.status)
  }

  return (await response.json()) as TicketResponse
}
