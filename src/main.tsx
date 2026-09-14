import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppLive from './AppLive'
import AuthGate from './auth/AuthGate'
import './styles.css'
import './auth/auth-extra.css'
import './dashboard-v2.css'
import './ui-extra.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <AppLive />
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>,
)
