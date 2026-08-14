import type { ApplicationRole } from '../api/currentUser'

export function roleHomePath(role: ApplicationRole): string {
  return role === 'employee' ? '/employee/tickets' : '/it/tickets'
}
