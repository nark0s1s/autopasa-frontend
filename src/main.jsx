import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Misma regla que `src/utils/api.js`: en dev sin VITE_API_URL, axios usa el origen actual + proxy `/api`.
const _apiBase =
  import.meta.env.VITE_API_URL != null && String(import.meta.env.VITE_API_URL).trim() !== ''
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : import.meta.env.DEV
      ? '(mismo origen; /api → proxy Vite)'
      : 'http://localhost:8000'
console.info(
  '[Autopasa]',
  'Origen de la página (barra del navegador) =',
  typeof window !== 'undefined' ? window.location.origin : '(SSR)',
  '| API axios base =',
  _apiBase
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
