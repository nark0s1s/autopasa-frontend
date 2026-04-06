import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { UserCog, Check, X } from 'lucide-react'
import { getRoles, getPermisos, getPermisosRol, sincronizarPermisosRol } from '../../utils/api'

function Notificacion({ notificacion, onClose }) {
  if (!notificacion) return null
  const esError = notificacion.tipo === 'error'
  return (
    <div
      className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${
        esError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
      }`}
    >
      <span>{esError ? '❌' : '✅'}</span>
      <div className="flex-1 text-sm">{notificacion.mensaje}</div>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}

export default function PermisosRoles() {
  const [roles, setRoles] = useState([])
  const [permisos, setPermisos] = useState([])
  const [rolId, setRolId] = useState('')
  const [seleccionados, setSeleccionados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  const cargarBase = useCallback(async () => {
    setCargando(true)
    try {
      const [r, p] = await Promise.all([getRoles(), getPermisos()])
      setRoles(Array.isArray(r) ? r : [])
      setPermisos(Array.isArray(p) ? p : [])
    } catch {
      setNotificacion({ tipo: 'error', mensaje: 'Error al cargar roles o permisos' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarBase()
  }, [cargarBase])

  useEffect(() => {
    if (!rolId) {
      setSeleccionados([])
      return
    }
    let cancel = false
    ;(async () => {
      setCargando(true)
      try {
        const asignados = await getPermisosRol(Number(rolId))
        if (!cancel) setSeleccionados((Array.isArray(asignados) ? asignados : []).map((x) => x.id))
      } catch {
        if (!cancel) setNotificacion({ tipo: 'error', mensaje: 'Error al cargar permisos del rol' })
      } finally {
        if (!cancel) setCargando(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [rolId])

  const toggle = (id) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const guardar = async () => {
    if (!rolId) {
      setNotificacion({ tipo: 'error', mensaje: 'Seleccione un rol' })
      return
    }
    setGuardando(true)
    try {
      await sincronizarPermisosRol(Number(rolId), seleccionados)
      setNotificacion({ tipo: 'ok', mensaje: 'Permisos guardados correctamente' })
    } catch (err) {
      const d = err.response?.data?.detail
      setNotificacion({ tipo: 'error', mensaje: typeof d === 'string' ? d : 'Error al guardar' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <UserCog className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permisos a roles</h1>
          <p className="text-sm text-gray-600">Asignar permisos del sistema a cada rol (lista plana por código).</p>
          <p className="text-sm text-primary-700 mt-1">
            Para el <strong>árbol del menú lateral</strong> (categorías y submenús), use{' '}
            <Link to="/seguridad/menus-roles" className="underline font-medium">
              Opciones de menú a roles
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
          <select
            value={rolId}
            onChange={(e) => setRolId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">— Seleccione —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Permisos</h2>
            <button
              type="button"
              onClick={guardar}
              disabled={!rolId || guardando || cargando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
            >
              <Check size={16} />
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {cargando && rolId ? (
            <p className="text-gray-500 text-sm">Cargando…</p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-2">
              {permisos.map((p) => (
                <label
                  key={p.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{p.nombre}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.codigo}</div>
                    {p.descripcion && <div className="text-xs text-gray-600 mt-0.5">{p.descripcion}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
