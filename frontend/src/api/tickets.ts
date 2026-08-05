import { API_BASE_URL } from '../config'
import type {
  TicketCreateRequest,
  TicketDetailsResponse,
  TicketResponse,
} from '../types/ticket'

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

async function getErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody
    if (typeof body.detail === 'string') {
      return body.detail
    }
  } catch {
    // The server may return an empty or non-JSON error response.
  }

  return fallbackMessage
}

async function requestJson<ResponseBody>(
  path: string,
  fallbackErrorMessage: string,
  init?: RequestInit,
): Promise<ResponseBody> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)

  if (!response.ok) {
    throw new TicketApiError(
      await getErrorMessage(response, fallbackErrorMessage),
      response.status,
    )
  }

  return (await response.json()) as ResponseBody
}

// Keeping HTTP details here lets components focus on form and rendering state.
export async function createTicket(
  ticket: TicketCreateRequest,
): Promise<TicketResponse> {
  return requestJson<TicketResponse>(
    '/tickets',
    'We could not create your ticket. Please try again.',
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket),
    },
  )
}

export async function getTicketsByRequester(
  requesterId: number,
): Promise<TicketResponse[]> {
  const query = new URLSearchParams({ requester_id: String(requesterId) })
  return requestJson<TicketResponse[]>(
    `/tickets?${query.toString()}`,
    'Could not load tickets.',
  )
}

export async function getTicket(
  ticketId: number,
): Promise<TicketDetailsResponse> {
  return requestJson<TicketDetailsResponse>(
    `/tickets/${encodeURIComponent(String(ticketId))}`,
    'Could not load ticket details.',
  )
}
