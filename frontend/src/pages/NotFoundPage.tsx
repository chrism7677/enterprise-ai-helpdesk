import { Link } from 'react-router-dom'
import { useApplicationAuth } from '../auth/ApplicationAuthContext'
import { roleHomePath } from '../auth/roles'

export function NotFoundPage() {
  const auth = useApplicationAuth()
  const homePath =
    auth.status === 'authenticated' ? roleHomePath(auth.currentUser.role) : '/'

  return (
    <main className="page-shell empty-state">
      <h1>Page not found</h1>
      <Link to={homePath}>Go to helpdesk home</Link>
    </main>
  )
}
