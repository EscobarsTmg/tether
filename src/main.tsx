import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRoot from './AppRoot'
import AuthGate from './auth/AuthGate'
import './styles.css'
import './auth/auth-extra.css'
import './ops-v3.css'
import './security-center.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <AppRoot />
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>,
)
