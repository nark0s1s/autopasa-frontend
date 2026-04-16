import { useState, useEffect, useCallback } from 'react'
import { LayoutGrid, Plus, Edit2, X } from 'lucide-react'
import { getUnidadesMedida, crearUnidadMedida, actualizarUnidadMedida } from '../../utils/api'

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

function ModalUM({ unidad, onClose, onSave }) {
  const esEdicion = !!unidad
  const [form, setForm] = useState({
    codigo: unidad?.codigo || '',
    nombre: unidad?.nombre || '',
    abreviatura: unidad?.abreviatura || '',
    decimales: unidad?.decimales ?? 3,
    es_peso: unidad?.es_peso ?? false,
    es_volumen: unidad?.es_volumen ?? false,
    activo: unidad?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'decimales' ? parseInt(value, 10) || 0 : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const payload = { ...form, decimales: parseInt(form.decimales, 10) || 0 }
      if (esEdicion) await actualizarUnidadMedida(unidad.id, payload)
      else await crearUnidadMedida(payload)
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
          <h2 className="text-lg font-bold text-gray-800">{esEdicion ? 'Editar unidad' : 'Nueva unidad de medida'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Abreviatura *</label>
              <input name="abreviatura" value={form.abreviatura} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Decimales</label>
            <input name="decimales" type="number" min="0" max="6" value={form.decimales} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="es_peso" checked={form.es_peso} onChange={handleChange} /> Es peso
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="es_volumen" checked={form.es_volumen} onChange={handleChange} /> Es volumen
          </label>
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

export default function UnidadesMedidaPage() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editar, setEditar] = useState(null)
  const [notif, setNotif] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getUnidadesMedida(null)
      setLista(Array.isArray(data) ? data : [])
    } catch {
      setNotif({ tipo: 'error', mensaje: 'No se pudieron cargar las unidades' })
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
            <LayoutGrid className="text-indigo-600" size={28} />
            Unidades de medida
          </h1>
          <p className="text-sm text-gray-400 mt-1">Catálogo para compras e inventario</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditar(null)
            setModal(true)
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
        >
          <Plus size={18} /> Nueva unidad
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
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Abrev.</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Dec.</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Activo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600"> </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lista.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{u.codigo}</td>
                    <td className="px-4 py-2 font-medium">{u.nombre}</td>
                    <td className="px-4 py-2 text-center">{u.abreviatura}</td>
                    <td className="px-4 py-2 text-center">{u.decimales}</td>
                    <td className="px-4 py-2 text-center">{u.activo ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditar(u)
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
          </div>
        )}
      </div>
      {modal && (
        <ModalUM
          unidad={editar}
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
