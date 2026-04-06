import { useState, useEffect, useCallback } from 'react'
import { Gauge, Plus, X } from 'lucide-react'
import {
  listarContometrosInfra,
  crearContometroInfra,
  actualizarContometroInfra,
  listarSurtidoresInfra,
  getProductos,
} from '../../utils/api'

function ModalContometro({ contometro, surtidores, productos, onClose, onGuardado }) {
  const edicion = !!contometro
  const [form, setForm] = useState({
    codigo: contometro?.codigo || '',
    surtidor_id: contometro?.surtidor_id || '',
    producto_id: contometro?.producto_id || '',
    numero_posicion: contometro?.numero_posicion ?? '',
    numero_serie: contometro?.numero_serie || '',
    lectura_actual: contometro?.lectura_actual ?? '0',
    activo: contometro?.activo ?? true,
    fecha_instalacion: contometro?.fecha_instalacion || '',
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const payload = {
        codigo: form.codigo,
        surtidor_id: Number(form.surtidor_id),
        producto_id: Number(form.producto_id),
        numero_posicion: form.numero_posicion === '' ? null : Number(form.numero_posicion),
        numero_serie: form.numero_serie || null,
        lectura_actual: form.lectura_actual === '' ? 0 : Number(form.lectura_actual),
        activo: form.activo,
        fecha_instalacion: form.fecha_instalacion || null,
      }
      if (edicion) {
        await actualizarContometroInfra(contometro.id, payload)
      } else {
        await crearContometroInfra(payload)
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
          <h2 className="font-bold text-gray-900">{edicion ? 'Editar contómetro' : 'Nuevo contómetro'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div>
            <label className="text-xs font-medium text-gray-600">Surtidor *</label>
            <select
              className="input w-full mt-1"
              value={form.surtidor_id}
              onChange={(e) => setForm({ ...form, surtidor_id: e.target.value })}
              required
            >
              <option value="">Seleccione…</option>
              {surtidores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Producto (combustible) *</label>
            <select
              className="input w-full mt-1"
              value={form.producto_id}
              onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
              required
            >
              <option value="">Seleccione…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Código contómetro *</label>
            <input
              className="input w-full mt-1"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Nº posición</label>
              <input
                type="number"
                className="input w-full mt-1"
                value={form.numero_posicion}
                onChange={(e) => setForm({ ...form, numero_posicion: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Lectura actual</label>
              <input
                type="number"
                step="0.01"
                className="input w-full mt-1"
                value={form.lectura_actual}
                onChange={(e) => setForm({ ...form, lectura_actual: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Nº serie</label>
            <input
              className="input w-full mt-1"
              value={form.numero_serie}
              onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Fecha instalación</label>
            <input
              type="date"
              className="input w-full mt-1"
              value={form.fecha_instalacion}
              onChange={(e) => setForm({ ...form, fecha_instalacion: e.target.value })}
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

export default function ContometrosPage() {
  const [items, setItems] = useState([])
  const [surtidores, setSurtidores] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [cnt, surt, prod] = await Promise.all([
        listarContometrosInfra(),
        listarSurtidoresInfra(),
        getProductos(),
      ])
      setItems(Array.isArray(cnt) ? cnt : [])
      setSurtidores(Array.isArray(surt) ? surt : [])
      setProductos(Array.isArray(prod) ? prod : [])
    } catch {
      setItems([])
      setSurtidores([])
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Gauge className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contómetros</h1>
              <p className="text-sm text-gray-600">Mantenimiento de contómetros y producto asociado</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary inline-flex items-center gap-2" onClick={() => setModal({})}>
            <Plus className="w-5 h-5" />
            Nuevo contómetro
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
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Surtidor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Lectura</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Activo</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const surt = surtidores.find((s) => s.id === r.surtidor_id)
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.codigo}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {surt ? `${surt.codigo}` : r.surtidor_id}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.producto ? `${r.producto.nombre}` : r.producto_id}
                        </td>
                        <td className="px-4 py-3">{r.lectura_actual}</td>
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
                    )
                  })}
                </tbody>
              </table>
              {items.length === 0 && <p className="p-6 text-gray-500">No hay contómetros.</p>}
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <ModalContometro
          contometro={modal.id ? modal : null}
          surtidores={surtidores}
          productos={productos}
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
