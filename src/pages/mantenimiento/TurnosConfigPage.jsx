import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, X } from 'lucide-react'
import {
  listarTurnosConfigInfra,
  crearTurnoConfigInfra,
  actualizarTurnoConfigInfra,
  listarIslasInfra,
} from '../../utils/api'

function ModalTurnoConfig({ config, islas, onClose, onGuardado }) {
  const edicion = !!config
  const [form, setForm] = useState({
    codigo: config?.codigo || '',
    nombre: config?.nombre || '',
    descripcion: config?.descripcion || '',
    activo: config?.activo ?? true,
    isla_ids: Array.isArray(config?.isla_ids) ? config.isla_ids : [],
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleIsla = (id) => {
    setForm((prev) => {
      const set = new Set(prev.isla_ids)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, isla_ids: [...set] }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const payload = {
        codigo: form.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        activo: form.activo,
        isla_ids: form.isla_ids,
      }
      if (edicion) {
        await actualizarTurnoConfigInfra(config.id, payload)
      } else {
        await crearTurnoConfigInfra(payload)
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-900">
            {edicion ? 'Editar configuración de turno' : 'Nueva configuración de turno'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          {err && <p className="text-sm text-red-600">{err}</p>}
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
          <div>
            <label className="text-xs font-medium text-gray-600">Descripción</label>
            <textarea
              className="input w-full mt-1 min-h-[72px]"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
          </label>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Islas incluidas en la liquidación</p>
            <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
              {islas.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm py-1 px-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={form.isla_ids.includes(i.id)}
                    onChange={() => toggleIsla(i.id)}
                  />
                  <span>
                    {i.codigo} — {i.nombre}
                  </span>
                </label>
              ))}
              {islas.length === 0 && <p className="text-sm text-gray-500 p-2">No hay islas.</p>}
            </div>
          </div>
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

export default function TurnosConfigPage() {
  const [items, setItems] = useState([])
  const [islas, setIslas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [cfgs, isl] = await Promise.all([listarTurnosConfigInfra(), listarIslasInfra()])
      setItems(Array.isArray(cfgs) ? cfgs : [])
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
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Turnos (configuración)</h1>
              <p className="text-sm text-gray-600">
                Plantillas de turno de liquidación e islas habilitadas (usadas al abrir turno día). Los vínculos
                también se pueden gestionar fila a fila en{' '}
                <span className="font-medium">Mantenimientos → Turno config ↔ Islas</span>.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary inline-flex items-center gap-2" onClick={() => setModal({})}>
            <Plus className="w-5 h-5" />
            Nueva configuración
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
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Islas</th>
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
                        {(r.isla_ids || []).length} isla(s)
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
              {items.length === 0 && (
                <p className="p-6 text-gray-500">No hay configuraciones. Cree una para vincular islas al turno día.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <ModalTurnoConfig
          config={modal.id ? modal : null}
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
