import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="page-shell empty-state">
      <h1>Page not found</h1>
      <Link to="/employee/tickets">Go to my tickets</Link>
    </main>
  )
}
