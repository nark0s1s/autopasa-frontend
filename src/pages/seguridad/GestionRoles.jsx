import { useState, useEffect, useCallback } from 'react'
import { Shield, Plus, Edit2, Trash2, X, Search } from 'lucide-react'
import { getRoles, crearRol, actualizarRol, eliminarRol } from '../../utils/api'

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
      <div className="flex-1 text-sm whitespace-pre-line">{notificacion.mensaje}</div>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}

function ModalRol({ rol, onClose, onSave }) {
  const esEdicion = !!rol
  const [form, setForm] = useState({
    nombre: rol?.nombre || '',
    descripcion: rol?.descripcion || '',
    activo: rol?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarRol(rol.id, form)
      } else {
        await crearRol(form)
      }
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Error al guardar rol')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{esEdicion ? 'Editar rol' : 'Nuevo rol'}</h3>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          {esEdicion && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
              Activo
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GestionRoles() {
  const [roles, setRoles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [notificacion, setNotificacion] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getRoles()
      setRoles(Array.isArray(data) ? data : [])
    } catch {
      setNotificacion({ tipo: 'error', mensaje: 'No se pudieron cargar los roles' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtrados = roles.filter(
    (r) =>
      (r.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Desactivar este rol?')) return
    try {
      await eliminarRol(id)
      setNotificacion({ tipo: 'ok', mensaje: 'Rol eliminado correctamente' })
      cargar()
    } catch (err) {
      const d = err.response?.data?.detail
      setNotificacion({ tipo: 'error', mensaje: typeof d === 'string' ? d : 'Error al eliminar' })
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de roles</h1>
            <p className="text-sm text-gray-600">Definir roles del sistema (como en SGC)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal({})}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
        >
          <Plus size={18} /> Nuevo rol
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por nombre o descripción…"
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
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold">Descripción</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{r.descripcion || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setModal(r)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg inline-flex"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(r.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg inline-flex"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && <p className="p-8 text-center text-gray-500">Sin resultados</p>}
          </div>
        )}
      </div>

      {modal !== null && (
        <ModalRol
          rol={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null)
            setNotificacion({ tipo: 'ok', mensaje: 'Guardado correctamente' })
            cargar()
          }}
        />
      )}
    </div>
  )
}
