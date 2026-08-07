import { API_BASE_URL } from '../config'
import type {
  TicketCreateRequest,
  TicketDetailsResponse,
  TicketResponse,
  WorkNoteResponse,
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

export async function getTicketsByAssignee(
  assigneeId: number,
): Promise<TicketResponse[]> {
  const query = new URLSearchParams({ assignee_id: String(assigneeId) })
  return requestJson<TicketResponse[]>(
    `/tickets?${query.toString()}`,
    'Could not load assigned tickets.',
  )
}

export async function getUnassignedTickets(): Promise<TicketResponse[]> {
  const query = new URLSearchParams({ unassigned: 'true' })
  return requestJson<TicketResponse[]>(
    `/tickets?${query.toString()}`,
    'Could not load the unassigned queue.',
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

export async function claimTicket(
  ticketId: number,
  assigneeId: number,
): Promise<TicketResponse> {
  return requestJson<TicketResponse>(
    `/tickets/${encodeURIComponent(String(ticketId))}/claim`,
    'Could not claim this ticket.',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee_id: assigneeId }),
    },
  )
}

export async function createTicketNote(
  ticketId: number,
  authorId: number,
  body: string,
): Promise<WorkNoteResponse> {
  // The backend derives the demo author today; retaining this argument keeps
  // the caller ready for the authenticated-user contract that will replace it.
  void authorId

  return requestJson<WorkNoteResponse>(
    `/tickets/${encodeURIComponent(String(ticketId))}/notes`,
    'Could not add the work note.',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  )
}

export async function resolveTicket(ticketId: number): Promise<TicketResponse> {
  return requestJson<TicketResponse>(
    `/tickets/${encodeURIComponent(String(ticketId))}/resolve`,
    'Could not resolve this ticket.',
    { method: 'PATCH' },
  )
}
