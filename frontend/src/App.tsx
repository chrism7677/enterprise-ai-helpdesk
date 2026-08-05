import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { CreateTicketPage } from './pages/CreateTicketPage'
import { EmployeeTicketsPage } from './pages/EmployeeTicketsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TicketDetailsPage } from './pages/TicketDetailsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/employee/tickets" replace />} />
        <Route path="/employee/tickets" element={<EmployeeTicketsPage />} />
        <Route path="/employee/tickets/new" element={<CreateTicketPage />} />
        <Route path="/employee/tickets/:ticketId" element={<TicketDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
