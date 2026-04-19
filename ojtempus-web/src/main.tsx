import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth'
import { SuccessProvider } from './contexts/SuccessContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SuccessProvider>
          <App />
        </SuccessProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
