import { useState, useEffect, useCallback } from 'react'
import { Users, Save, X, Search } from 'lucide-react'
import { getEmpleadosF, getRoles, actualizarEmpleado } from '../../utils/api'

/** Mismo criterio que en la API (rol_id puede venir como string desde JSON). */
function normalizarRolId(v) {
  if (v === '' || v === undefined || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

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

export default function AsignarRolEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [roles, setRoles] = useState([])
  const [cambios, setCambios] = useState({})
  const [guardandoId, setGuardandoId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [notificacion, setNotificacion] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [emps, r] = await Promise.all([getEmpleadosF(), getRoles()])
      setEmpleados(Array.isArray(emps) ? emps : [])
      setRoles(Array.isArray(r) ? r : [])
      setCambios({})
    } catch {
      setNotificacion({ tipo: 'error', mensaje: 'Error al cargar empleados o roles' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const rolEfectivo = (emp) => {
    if (cambios[emp.id] !== undefined) return cambios[emp.id]
    return emp.rol_id ?? ''
  }

  const setRolLocal = (empleadoId, rolId) => {
    const v = rolId === '' ? null : Number(rolId)
    setCambios((prev) => ({ ...prev, [empleadoId]: v }))
  }

  const guardarUno = async (emp) => {
    const rid = normalizarRolId(rolEfectivo(emp))
    setGuardandoId(emp.id)
    try {
      await actualizarEmpleado(emp.id, { rol_id: rid })
      setCambios((prev) => {
        const n = { ...prev }
        delete n[emp.id]
        return n
      })
      setNotificacion({ tipo: 'ok', mensaje: `Rol actualizado para ${emp.nombres}` })
      cargar()
    } catch (err) {
      const d = err.response?.data?.detail
      setNotificacion({ tipo: 'error', mensaje: typeof d === 'string' ? d : 'Error al guardar' })
    } finally {
      setGuardandoId(null)
    }
  }

  const texto = (e) =>
    `${e.nombres} ${e.apellidos} ${e.usuario} ${e.codigo}`.toLowerCase().includes(busqueda.toLowerCase())

  const filtrados = empleados.filter(texto)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignar rol a empleados</h1>
          <p className="text-sm text-gray-600">En Autopasa cada empleado tiene un único rol (como usuario–rol en SGC)</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por nombre, usuario o código…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {cargando ? (
          <p className="p-8 text-center text-gray-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Empleado</th>
                  <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold">Rol</th>
                  <th className="text-right px-4 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e) => {
                  const orig = normalizarRolId(e.rol_id)
                  const cur =
                    cambios[e.id] !== undefined ? normalizarRolId(cambios[e.id]) : orig
                  const dirty = cur !== orig
                  return (
                    <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {e.nombres} {e.apellidos}
                        </div>
                        <div className="text-xs text-gray-500">{e.cargo}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.usuario}</td>
                      <td className="px-4 py-3">
                        <select
                          value={rolEfectivo(e) == null || rolEfectivo(e) === '' ? '' : String(rolEfectivo(e))}
                          onChange={(ev) => setRolLocal(e.id, ev.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 min-w-[160px]"
                        >
                          <option value="">— Sin rol —</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                              {!r.activo ? ' (inactivo)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => guardarUno(e)}
                          disabled={!dirty || guardandoId === e.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium disabled:opacity-40"
                        >
                          <Save size={14} />
                          {guardandoId === e.id ? '…' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
