import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { getSupabasePublicConfig } from './lib/supabase'
import './index.css'

// DevTools: confirm which Supabase project the bundle uses (no secrets)
if (typeof window !== 'undefined') {
  window.__HM_SUPABASE_CONFIG__ = getSupabasePublicConfig()
  console.info('[HM] Supabase project', window.__HM_SUPABASE_CONFIG__)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
