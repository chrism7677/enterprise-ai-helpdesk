export function parseTicketId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null
  }

  const ticketId = Number(value)
  return Number.isSafeInteger(ticketId) && ticketId > 0 ? ticketId : null
}
