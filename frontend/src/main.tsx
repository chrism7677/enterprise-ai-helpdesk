import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.tsx'
import { ApplicationAuthProvider } from './auth/ApplicationAuthProvider.tsx'
import { initializeMsal, msalInstance } from './auth/msalInstance.ts'
import { AuthenticationControls } from './components/AuthenticationControls.tsx'

async function bootstrapApplication(): Promise<void> {
  await initializeMsal()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <ApplicationAuthProvider>
          <AuthenticationControls />
          <App />
        </ApplicationAuthProvider>
      </MsalProvider>
    </StrictMode>,
  )
}

void bootstrapApplication()
