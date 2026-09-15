import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppOpsV3 from './AppOpsV3'
import AuthGate from './auth/AuthGate'
import './styles.css'
import './auth/auth-extra.css'
import './ops-v3.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <AppOpsV3 />
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>,
)
