export type TicketStatus = 'open' | 'in_progress' | 'resolved'

export type TicketPriority = 'low' | 'medium' | 'high'

export type TicketCategory =
  | 'hardware'
  | 'software'
  | 'network'
  | 'access'
  | 'other'

export interface TicketCreateRequest {
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  requester_id: number
}

export interface TicketResponse {
  id: number
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  requester_id: number
  assignee_id: number | null
  created_at: string
  updated_at: string
}
