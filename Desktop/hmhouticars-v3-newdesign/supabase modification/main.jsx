import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// BUG FIX: Original leaked SUPABASE_URL to console in production.
// Never log environment variables — they appear in browser devtools.
if (import.meta.env.DEV) {
  console.log('[dev] Supabase project:', import.meta.env.VITE_SUPABASE_URL?.split('.')[0])
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
