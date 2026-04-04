import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// VITE_API_URL se sustituye en el build (Vite); solo afecta a axios/fetch al backend.
// La barra del navegador siempre muestra el dominio del HTML (frontend), p. ej. .../login es React Router, no esta URL.
const _apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
console.info(
  '[Autopasa]',
  'Origen de la página (barra del navegador) =',
  typeof window !== 'undefined' ? window.location.origin : '(SSR)',
  '| API axios (VITE_API_URL) =',
  _apiBase
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
