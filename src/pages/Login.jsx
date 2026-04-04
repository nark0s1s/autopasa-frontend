import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getLoginPostUrl } from '../utils/api'
import { Fuel, Lock, User, AlertCircle } from 'lucide-react'

function Login() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiDebugLines, setApiDebugLines] = useState([])
  const { login } = useAuth()
  const navigate = useNavigate()

  const showApiDebugPanel = useMemo(() => {
    if (typeof window === 'undefined') return false
    const q = new URLSearchParams(window.location.search).get('apiDebug')
    if (q === '1' || q === 'true') return true
    return import.meta.env.VITE_SHOW_LOGIN_DEBUG === 'true'
  }, [])

  const appendDebug = (line) => {
    const t = new Date().toISOString()
    setApiDebugLines((prev) => [...prev.slice(-24), `[${t}] ${line}`])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const postUrl = getLoginPostUrl()
    if (showApiDebugPanel) {
      const ts = new Date().toISOString()
      setApiDebugLines([
        `[${ts}] Barra del navegador (solo HTML del SPA): ${window.location.href}`,
        `[${ts}] POST real del login (busca ESTO en Red → XHR): ${postUrl}`,
      ])
    }
    console.info('[Autopasa debug] Formulario enviado (login en contexto → api.js)')

    try {
      await login(usuario, password)
      if (showApiDebugPanel) appendDebug('POST /api/auth/login → OK; /api/auth/me OK; navegando…')
      console.info('[Autopasa debug] Login completo; navegando a /liquidacion-grifero')
      navigate('/liquidacion-grifero')
    } catch (err) {
      const d = err.response?.data?.detail
      let msg = 'Usuario o contraseña incorrectos'
      if (!err.response) {
        msg =
          'No se pudo contactar al API. Revise la red, CORS o que VITE_API_URL apunte al backend correcto.'
      } else if (typeof d === 'string') {
        msg = d
      } else if (Array.isArray(d)) {
        msg = d.map((x) => x.msg || JSON.stringify(x)).join('; ')
      }
      setError(msg)
      if (showApiDebugPanel) {
        appendDebug(
          `Error: ${err.code || '—'} status=${err.response?.status ?? 'sin respuesta (CORS/red)'} → ${msg}`
        )
      }
      console.error('[Autopasa debug] Login.jsx catch (resumen en pantalla):', msg, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-4">
      <div className="w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-lg mb-4" style={{ backgroundColor: '#faf8e4' }}>
            <Fuel className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Autopasa</h1>
          <p className="text-primary-100">Sistema de Control de Ventas</p>
        </div>

        {/* Card de Login */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuario */}
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="input pl-10"
                  placeholder="Ingrese su usuario"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Usuario de prueba: <span className="font-semibold">admin</span>
              <br />
              Contraseña: <span className="font-semibold">admin123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-primary-100 text-sm">
          <p>© 2026 Autopasa. Todos los derechos reservados.</p>
        </div>

        {showApiDebugPanel && (
          <div className="mt-6 w-full max-w-lg mx-auto rounded-lg bg-black/80 text-green-400 text-xs font-mono p-4 text-left shadow-lg border border-green-700/50">
            <p className="text-green-300 font-sans font-semibold mb-2">
              Depuración API (añade <code className="bg-black/50 px-1">?apiDebug=1</code> a la URL)
            </p>
            <p className="text-gray-400 font-sans text-[11px] mb-2">
              El GET a <code className="text-gray-300">…/login</code> con 304 es solo el HTML; el login es el POST de abajo.
            </p>
            <ul className="space-y-1 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
              {apiDebugLines.length === 0 ? (
                <li className="text-gray-500">Pulsa Ingresar para ver el flujo.</li>
              ) : (
                apiDebugLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
