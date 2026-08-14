import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthenticatedHome, RequireRole } from './auth/ProtectedRoutes'
import { ApplicationNavigation } from './components/ApplicationNavigation'
import { CreateTicketPage } from './pages/CreateTicketPage'
import { EmployeeTicketsPage } from './pages/EmployeeTicketsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ITTicketDetailsPage } from './pages/ITTicketDetailsPage'
import { ITTicketsPage } from './pages/ITTicketsPage'
import { ITUnassignedTicketsPage } from './pages/ITUnassignedTicketsPage'
import { TicketDetailsPage } from './pages/TicketDetailsPage'

function App() {
  return (
    <BrowserRouter>
      <ApplicationNavigation />
      <Routes>
        <Route path="/" element={<AuthenticatedHome />} />
        <Route element={<RequireRole role="employee" />}>
          <Route path="/employee/tickets" element={<EmployeeTicketsPage />} />
          <Route path="/employee/tickets/new" element={<CreateTicketPage />} />
          <Route path="/employee/tickets/:ticketId" element={<TicketDetailsPage />} />
        </Route>
        <Route element={<RequireRole role="it_staff" />}>
          <Route path="/it/tickets" element={<ITTicketsPage />} />
          <Route path="/it/tickets/unassigned" element={<ITUnassignedTicketsPage />} />
          <Route path="/it/tickets/:ticketId" element={<ITTicketDetailsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
