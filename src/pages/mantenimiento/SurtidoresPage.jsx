import { useState, useEffect, useCallback } from 'react'
import { Fuel, Plus, X } from 'lucide-react'
import {
  listarSurtidoresInfra,
  crearSurtidorInfra,
  actualizarSurtidorInfra,
  listarIslasInfra,
} from '../../utils/api'

function ModalSurtidor({ surtidor, islas, onClose, onGuardado }) {
  const edicion = !!surtidor
  const [form, setForm] = useState({
    codigo: surtidor?.codigo || '',
    nombre: surtidor?.nombre || '',
    marca: surtidor?.marca || '',
    modelo: surtidor?.modelo || '',
    isla_id: surtidor?.isla_id || '',
    activo: surtidor?.activo ?? true,
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const payload = { ...form, isla_id: Number(form.isla_id) }
      if (edicion) {
        await actualizarSurtidorInfra(surtidor.id, payload)
      } else {
        await crearSurtidorInfra(payload)
      }
      onGuardado()
    } catch (er) {
      const d = er.response?.data?.detail
      setErr(typeof d === 'string' ? d : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">{edicion ? 'Editar surtidor' : 'Nuevo surtidor'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div>
            <label className="text-xs font-medium text-gray-600">Isla *</label>
            <select
              className="input w-full mt-1"
              value={form.isla_id}
              onChange={(e) => setForm({ ...form, isla_id: e.target.value })}
              required
            >
              <option value="">Seleccione…</option>
              {islas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.codigo} — {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Código *</label>
            <input
              className="input w-full mt-1"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Nombre *</label>
            <input
              className="input w-full mt-1"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Marca</label>
              <input
                className="input w-full mt-1"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Modelo</label>
              <input
                className="input w-full mt-1"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SurtidoresPage() {
  const [items, setItems] = useState([])
  const [islas, setIslas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [surt, isl] = await Promise.all([listarSurtidoresInfra(), listarIslasInfra()])
      setItems(Array.isArray(surt) ? surt : [])
      setIslas(Array.isArray(isl) ? isl : [])
    } catch {
      setItems([])
      setIslas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Fuel className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Surtidores</h1>
              <p className="text-sm text-gray-600">Mantenimiento de surtidores por isla</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary inline-flex items-center gap-2" onClick={() => setModal({})}>
            <Plus className="w-5 h-5" />
            Nuevo surtidor
          </button>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Cargando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Isla</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Activo</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.codigo}</td>
                      <td className="px-4 py-3">{r.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.isla ? `${r.isla.codigo} — ${r.isla.nombre}` : r.isla_id}
                      </td>
                      <td className="px-4 py-3">{r.activo ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-primary-600 hover:underline text-sm"
                          onClick={() => setModal(r)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && <p className="p-6 text-gray-500">No hay surtidores.</p>}
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <ModalSurtidor
          surtidor={modal.id ? modal : null}
          islas={islas}
          onClose={() => setModal(null)}
          onGuardado={() => {
            setModal(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}
