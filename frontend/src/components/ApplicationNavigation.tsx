import { NavLink } from 'react-router-dom'
import { useApplicationAuth } from '../auth/ApplicationAuthContext'

export function ApplicationNavigation() {
  const auth = useApplicationAuth()

  if (auth.status !== 'authenticated') {
    return null
  }

  return (
    <nav className="application-navigation" aria-label="Helpdesk navigation">
      {auth.currentUser.role === 'employee' ? (
        <>
          <NavLink to="/employee/tickets">My Tickets</NavLink>
          <NavLink to="/employee/tickets/new">Create Ticket</NavLink>
        </>
      ) : (
        <>
          <NavLink to="/it/tickets">Assigned Tickets</NavLink>
          <NavLink to="/it/tickets/unassigned">Unassigned Queue</NavLink>
        </>
      )}
    </nav>
  )
}
