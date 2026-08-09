import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.tsx'
import { initializeMsal, msalInstance } from './auth/msalInstance.ts'
import { AuthenticationControls } from './components/AuthenticationControls.tsx'

async function bootstrapApplication(): Promise<void> {
  await initializeMsal()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <AuthenticationControls />
        <App />
      </MsalProvider>
    </StrictMode>,
  )
}

void bootstrapApplication()
