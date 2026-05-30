import { useState, useEffect, useCallback } from 'react'
import { Layers, Plus, Edit2, X } from 'lucide-react'
import { getCentrosCostoGasto, crearCentroCosto, actualizarCentroCosto } from '../../utils/api'

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

function ModalCentro({ centro, onClose, onSave }) {
  const esEdicion = !!centro
  const [form, setForm] = useState({
    codigo: centro?.codigo || '',
    nombre: centro?.nombre || '',
    descripcion: centro?.descripcion || '',
    activo: centro?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        activo: form.activo,
      }
      if (esEdicion) await actualizarCentroCosto(centro.id, payload)
      else await crearCentroCosto(payload)
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{esEdicion ? 'Editar centro de costo' : 'Nuevo centro de costo'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
            <input name="codigo" value={form.codigo} onChange={handleChange} required maxLength={20} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required maxLength={120} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {esEdicion && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} /> Activo
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CentrosCostoPage() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editar, setEditar] = useState(null)
  const [notif, setNotif] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getCentrosCostoGasto(null)
      setLista(Array.isArray(data) ? data : [])
    } catch {
      setNotif({ tipo: 'error', mensaje: 'No se pudieron cargar los centros de costo' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="p-6 space-y-6">
      <Notificacion notificacion={notif} onClose={() => setNotif(null)} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-indigo-600" size={28} />
            Centros de costo
          </h1>
          <p className="text-sm text-gray-400 mt-1">Usados en gastos operativos para clasificar egresos</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditar(null)
            setModal(true)
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
        >
          <Plus size={18} /> Nuevo centro
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center text-gray-400">Cargando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Descripción</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Activo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600"> </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lista.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{c.codigo}</td>
                    <td className="px-4 py-2 font-medium">{c.nombre}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs max-w-xs truncate" title={c.descripcion || ''}>
                      {c.descripcion || '—'}
                    </td>
                    <td className="px-4 py-2 text-center">{c.activo ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditar(c)
                          setModal(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">Sin registros</p>}
          </div>
        )}
      </div>
      {modal && (
        <ModalCentro
          centro={editar}
          onClose={() => {
            setModal(false)
            setEditar(null)
          }}
          onSave={() => {
            setModal(false)
            setEditar(null)
            setNotif({ tipo: 'exito', mensaje: 'Guardado correctamente' })
            cargar()
          }}
        />
      )}
    </div>
  )
}
