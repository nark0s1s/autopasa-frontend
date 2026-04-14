import { useState, useEffect, useCallback } from 'react'
import { Store } from 'lucide-react'
import {
  listarVentasServicentroPendientes,
  crearVentaServicentroPendiente,
  actualizarVentaServicentroPendiente,
  eliminarVentaServicentroPendiente,
} from '../utils/api'

function toYMD(d) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

function fmt2(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toFixed(2) : '0.00'
}

export default function OperacionesServicentroPage() {
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return toYMD(d)
  })
  const [fechaHasta, setFechaHasta] = useState(() => toYMD(new Date()))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [fechaVenta, setFechaVenta] = useState(() => toYMD(new Date()))
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editId, setEditId] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listarVentasServicentroPendientes({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  const resetForm = () => {
    setEditId(null)
    setFechaVenta(toYMD(new Date()))
    setMonto('')
    setConcepto('')
    setObservaciones('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      fecha_venta: fechaVenta,
      monto: parseFloat(monto),
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    }
    if (!Number.isFinite(payload.monto) || payload.monto < 0) return
    try {
      setGuardando(true)
      if (editId) {
        await actualizarVentaServicentroPendiente(editId, payload)
      } else {
        await crearVentaServicentroPendiente(payload)
      }
      resetForm()
      await cargar()
    } catch (err) {
      const d = err.response?.data?.detail
      alert(typeof d === 'string' ? d : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const onEdit = (r) => {
    setEditId(r.id)
    setFechaVenta((r.fecha_venta || '').slice(0, 10))
    setMonto(r.monto != null ? String(r.monto) : '')
    setConcepto(r.concepto ?? '')
    setObservaciones(r.observaciones ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta venta servicentro pendiente?')) return
    try {
      await eliminarVentaServicentroPendiente(id)
      if (editId === id) resetForm()
      await cargar()
    } catch (err) {
      const d = err.response?.data?.detail
      alert(typeof d === 'string' ? d : 'No se pudo eliminar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
        <Store className="w-8 h-8 text-teal-600" />
        Operaciones — Venta servicentro
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Registre ventas por día; al crear una consolidación podrá incluir días para vincular estas filas pendientes.
      </p>

      <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Desde</label>
          <input type="date" className="input" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Hasta</label>
          <input type="date" className="input" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={cargar} disabled={loading}>
          {loading ? '…' : 'Refrescar'}
        </button>
      </div>

      <div className="card p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">{editId ? 'Editar registro' : 'Nueva venta'}</h2>
        <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Día de la venta</label>
            <input type="date" className="input w-full" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (opcional)</label>
            <input type="text" className="input w-full" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea className="input w-full min-h-[72px]" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            {editId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : editId ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Fecha venta</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3">Concepto</th>
              <th className="p-3">Obs.</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Sin registros pendientes en el rango.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="p-3">{(r.fecha_venta || '').slice(0, 10)}</td>
                  <td className="p-3 text-right tabular-nums">S/ {fmt2(r.monto)}</td>
                  <td className="p-3">{r.concepto || '—'}</td>
                  <td className="p-3 max-w-[200px] truncate" title={r.observaciones || ''}>
                    {r.observaciones || '—'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button type="button" className="text-primary-600 text-xs font-medium" onClick={() => onEdit(r)}>
                      Editar
                    </button>
                    <button type="button" className="text-red-600 text-xs font-medium" onClick={() => onDelete(r.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
