import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// VITE_API_URL se sustituye en el build (Vite); solo afecta a axios al backend.
// La barra del navegador = dominio del SPA. Rutas como /login son React Router: Nginx suele
// devolver el mismo index.html para cualquier path → no es 404. GET /login puede verse 200/304:
// 304 = "sigue valiendo tu caché del HTML", normal; el login real es POST a VITE_API_URL/api/auth/login.
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
