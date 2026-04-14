import { useState, useEffect, useCallback } from 'react'
import { Wallet } from 'lucide-react'
import {
  listarCobranzasPendientes,
  crearCobranzaPendiente,
  actualizarCobranzaPendiente,
  eliminarCobranzaPendiente,
  getClientesAdmin,
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

function neto(f, r) {
  const a = Number(f) || 0
  const b = Number(r) || 0
  return Math.max(0, a - b)
}

export default function OperacionesCobranzasPage() {
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return toYMD(d)
  })
  const [fechaHasta, setFechaHasta] = useState(() => toYMD(new Date()))
  const [rows, setRows] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [fechaCobranza, setFechaCobranza] = useState(() => toYMD(new Date()))
  const [numeroFactura, setNumeroFactura] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [montoFactura, setMontoFactura] = useState('')
  const [montoRetencion, setMontoRetencion] = useState('0')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    getClientesAdmin(true)
      .then((d) => setClientes(Array.isArray(d) ? d : []))
      .catch(() => setClientes([]))
  }, [])

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listarCobranzasPendientes({
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
    setFechaCobranza(toYMD(new Date()))
    setNumeroFactura('')
    setClienteId('')
    setMontoFactura('')
    setMontoRetencion('0')
    setConcepto('')
    setObservaciones('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const mf = parseFloat(montoFactura)
    const mr = parseFloat(montoRetencion) || 0
    if (mr > mf) return
    const payload = {
      fecha_cobranza: fechaCobranza,
      numero_factura: numeroFactura.trim() || null,
      cliente_id: clienteId ? parseInt(clienteId, 10) : null,
      monto_factura: mf,
      monto_retencion: mr,
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    }
    try {
      setGuardando(true)
      if (editId) {
        await actualizarCobranzaPendiente(editId, payload)
      } else {
        await crearCobranzaPendiente(payload)
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
    setFechaCobranza((r.fecha_cobranza || '').slice(0, 10))
    setNumeroFactura(r.numero_factura ?? '')
    setClienteId(r.cliente_id != null ? String(r.cliente_id) : '')
    setMontoFactura(r.monto_factura != null ? String(r.monto_factura) : '')
    setMontoRetencion(r.monto_retencion != null ? String(r.monto_retencion) : '0')
    setConcepto(r.concepto ?? '')
    setObservaciones(r.observaciones ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta cobranza pendiente?')) return
    try {
      await eliminarCobranzaPendiente(id)
      if (editId === id) resetForm()
      await cargar()
    } catch (err) {
      const d = err.response?.data?.detail
      alert(typeof d === 'string' ? d : 'No se pudo eliminar')
    }
  }

  const retMayor = (parseFloat(montoRetencion) || 0) > (parseFloat(montoFactura) || 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
        <Wallet className="w-8 h-8 text-cyan-700" />
        Operaciones — Cobranzas
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Registre cobranzas con fecha, factura y cliente; al consolidar turnos podrá incluir días para vincular estas filas
        pendientes.
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
        <h2 className="font-semibold text-gray-900 mb-4">{editId ? 'Editar cobranza' : 'Nueva cobranza'}</h2>
        <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de cobranza</label>
            <input type="date" className="input w-full" value={fechaCobranza} onChange={(e) => setFechaCobranza(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nº factura</label>
            <input type="text" className="input w-full" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select className="input w-full" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social || c.codigo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto factura (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={montoFactura}
              onChange={(e) => setMontoFactura(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Retención (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={montoRetencion}
              onChange={(e) => setMontoRetencion(e.target.value)}
            />
            {retMayor && <p className="text-xs text-red-600 mt-1">La retención no puede superar la factura.</p>}
          </div>
          <div className="sm:col-span-2 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
            <p className="text-xs text-teal-900 font-medium">Monto cobrado (factura − retención)</p>
            <p className="text-lg font-bold text-teal-800">S/ {fmt2(neto(montoFactura, montoRetencion))}</p>
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
            <button type="submit" className="btn btn-primary" disabled={guardando || retMayor}>
              {guardando ? 'Guardando…' : editId ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Factura</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Fact.</th>
              <th className="p-3 text-right">Ret.</th>
              <th className="p-3 text-right">Neto</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Sin registros pendientes en el rango.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="p-3">{(r.fecha_cobranza || '').slice(0, 10)}</td>
                  <td className="p-3 font-mono text-xs">{r.numero_factura || '—'}</td>
                  <td className="p-3 max-w-[180px] truncate" title={r.cliente_razon_social || ''}>
                    {r.cliente_razon_social || '—'}
                  </td>
                  <td className="p-3 text-right tabular-nums">S/ {fmt2(r.monto_factura)}</td>
                  <td className="p-3 text-right tabular-nums">S/ {fmt2(r.monto_retencion)}</td>
                  <td className="p-3 text-right tabular-nums font-medium">
                    S/ {fmt2(r.monto_cobrado != null ? r.monto_cobrado : neto(r.monto_factura, r.monto_retencion))}
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
