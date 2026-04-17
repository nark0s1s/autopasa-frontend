import { useState, useEffect, useCallback, useMemo } from 'react'
import { Wallet, Plus, Pencil, Trash2, X } from 'lucide-react'
import {
  listarCobranzasPendientes,
  crearCobranzaPendiente,
  actualizarCobranzaPendiente,
  eliminarCobranzaPendiente,
  getClientesAdmin,
  getTiposPago,
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

/** Catálogo tipo_pago para cobranza (códigos COB_* insertados por migración SQL). */
function tiposPagoCobranza(tipos) {
  if (!Array.isArray(tipos)) return []
  return tipos.filter((t) => t.codigo && String(t.codigo).startsWith('COB_'))
}

function etiquetaMedioRow(r) {
  if (r.tipo_pago_nombre) return r.tipo_pago_nombre
  if (r.tipo_pago_codigo) return r.tipo_pago_codigo
  return '—'
}

function CobranzaFormModal({ open, mode, initialRow, clientes, tiposCobranza, onClose, onGuardado }) {
  const [fechaCobranza, setFechaCobranza] = useState(() => toYMD(new Date()))
  const [numeroFactura, setNumeroFactura] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [montoFactura, setMontoFactura] = useState('')
  const [montoRetencion, setMontoRetencion] = useState('0')
  const [tipoPagoId, setTipoPagoId] = useState('')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)

  const defaultTipoId = useMemo(() => {
    const ef = tiposCobranza.find((t) => t.codigo === 'COB_EFECTIVO')
    return ef ? String(ef.id) : tiposCobranza[0] ? String(tiposCobranza[0].id) : ''
  }, [tiposCobranza])

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initialRow) {
      const r = initialRow
      setFechaCobranza((r.fecha_cobranza || '').slice(0, 10))
      setNumeroFactura(r.numero_factura ?? '')
      setClienteId(r.cliente_id != null ? String(r.cliente_id) : '')
      setMontoFactura(r.monto_factura != null ? String(r.monto_factura) : '')
      setMontoRetencion(r.monto_retencion != null ? String(r.monto_retencion) : '0')
      setTipoPagoId(r.tipo_pago_id != null ? String(r.tipo_pago_id) : defaultTipoId)
      setConcepto(r.concepto ?? '')
      setObservaciones(r.observaciones ?? '')
    } else {
      setFechaCobranza(toYMD(new Date()))
      setNumeroFactura('')
      setClienteId('')
      setMontoFactura('')
      setMontoRetencion('0')
      setTipoPagoId(defaultTipoId)
      setConcepto('')
      setObservaciones('')
    }
  }, [open, mode, initialRow, defaultTipoId])

  if (!open) return null

  const n = neto(montoFactura, montoRetencion)
  const retMayor = (parseFloat(montoRetencion) || 0) > (parseFloat(montoFactura) || 0)
  const sinCatalogo = tiposCobranza.length === 0

  const submit = async (e) => {
    e.preventDefault()
    const mf = parseFloat(montoFactura)
    const mr = parseFloat(montoRetencion) || 0
    if (mr > mf || !Number.isFinite(mf) || !tipoPagoId) return
    const payload = {
      fecha_cobranza: fechaCobranza,
      numero_factura: numeroFactura.trim() || null,
      cliente_id: clienteId ? parseInt(clienteId, 10) : null,
      monto_factura: mf,
      monto_retencion: mr,
      tipo_pago_id: parseInt(tipoPagoId, 10),
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    }
    try {
      setGuardando(true)
      if (mode === 'edit' && initialRow?.id) {
        await actualizarCobranzaPendiente(initialRow.id, payload)
      } else {
        await crearCobranzaPendiente(payload)
      }
      onGuardado()
      onClose()
    } catch (err) {
      const d = err.response?.data?.detail
      alert(typeof d === 'string' ? d : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[1px]">
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cobranza-modal-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 id="cobranza-modal-title" className="text-lg font-semibold text-gray-900">
              {mode === 'edit' ? 'Modificar cobranza' : 'Nueva cobranza'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pendiente de consolidación: se vinculará al cuadre al incluir el día correspondiente. Medio de pago desde
              catálogo (tipo_pago).
            </p>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de cobranza</label>
              <input
                type="date"
                className="input w-full"
                value={fechaCobranza}
                onChange={(e) => setFechaCobranza(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nº factura</label>
              <input type="text" className="input w-full" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto factura (S/)</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Retención (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input w-full"
                value={montoRetencion}
                onChange={(e) => setMontoRetencion(e.target.value)}
              />
            </div>
          </div>
          {retMayor && <p className="text-xs text-red-600">La retención no puede superar el monto de la factura.</p>}
          <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100/80 px-4 py-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-teal-900">Neto cobrado</p>
              <p className="text-xl font-bold text-teal-800 tabular-nums">S/ {fmt2(n)}</p>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="block text-xs font-medium text-teal-900 mb-1">Medio de pago (catálogo)</label>
              {sinCatalogo ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-2">
                  No hay tipos COB_* en tipo_pago. Ejecute la migración SQL que inserta COB_EFECTIVO, COB_TRANSFERENCIA y
                  COB_CHEQUE.
                </p>
              ) : (
                <select className="input w-full text-sm" value={tipoPagoId} onChange={(e) => setTipoPagoId(e.target.value)} required>
                  {tiposCobranza.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre || t.codigo}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Concepto (opcional)</label>
            <input type="text" className="input w-full" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones (opcional)</label>
            <textarea className="input w-full min-h-[72px]" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={guardando || retMayor || sinCatalogo || !tipoPagoId}>
              {guardando ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({ row, open, onClose, onConfirm, loading }) {
  if (!open || !row) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100" role="dialog" aria-modal="true">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar cobranza</h3>
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar la cobranza del {String(row.fecha_cobranza || '').slice(0, 10)}
          {row.numero_factura ? ` · Fact. ${row.numero_factura}` : ''} por S/{' '}
          {fmt2(row.monto_cobrado != null ? row.monto_cobrado : neto(row.monto_factura, row.monto_retencion))}?
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn bg-red-600 hover:bg-red-700 text-white border-0" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
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
  const [tiposPago, setTiposPago] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, mode: 'create', row: null })
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const tiposCobranza = useMemo(() => tiposPagoCobranza(tiposPago), [tiposPago])

  useEffect(() => {
    getClientesAdmin(true)
      .then((d) => setClientes(Array.isArray(d) ? d : []))
      .catch(() => setClientes([]))
    getTiposPago(true)
      .then((d) => setTiposPago(Array.isArray(d) ? d : []))
      .catch(() => setTiposPago([]))
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

  const cerrarModal = () => setModal({ open: false, mode: 'create', row: null })

  const onConfirmDelete = async () => {
    if (!deleteRow) return
    try {
      setDeleting(true)
      await eliminarCobranzaPendiente(deleteRow.id)
      setDeleteRow(null)
      await cargar()
    } catch (err) {
      const d = err.response?.data?.detail
      alert(typeof d === 'string' ? d : 'No se pudo eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/25">
                <Wallet className="w-6 h-6" />
              </span>
              Operaciones — Cobranzas
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              Registre cobranzas con fecha, factura, cliente y medio de pago (catálogo tipo_pago). Quedan pendientes hasta
              que una consolidación de turnos incluya el día y las vincule al cuadre.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center justify-center gap-2 self-start shadow-md"
            onClick={() => setModal({ open: true, mode: 'create', row: null })}
          >
            <Plus className="w-4 h-4" />
            Nueva cobranza
          </button>
        </header>

        <div className="card p-4 sm:p-5 mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end justify-between shadow-sm border-gray-200/80">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
              <input type="date" className="input" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
              <input type="date" className="input" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <button type="button" className="btn btn-secondary h-10" onClick={cargar} disabled={loading}>
              {loading ? 'Cargando…' : 'Refrescar'}
            </button>
          </div>
          <p className="text-xs text-gray-500 sm:text-right sm:max-w-xs">
            {rows.length} registro{rows.length !== 1 ? 's' : ''} en el rango seleccionado.
          </p>
        </div>

        <div className="card overflow-hidden shadow-sm border-gray-200/80">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Cobranzas pendientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Factura</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium text-right">Fact.</th>
                  <th className="px-4 py-3 font-medium text-right">Ret.</th>
                  <th className="px-4 py-3 font-medium text-right">Neto</th>
                  <th className="px-4 py-3 font-medium">Medio (catálogo)</th>
                  <th className="px-4 py-3 font-medium text-right w-[1%] whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      Sin registros pendientes en el rango. Use &quot;Nueva cobranza&quot; para agregar.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-cyan-50/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-800">{(r.fecha_cobranza || '').slice(0, 10)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.numero_factura || '—'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-700" title={r.cliente_razon_social || ''}>
                        {r.cliente_razon_social || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800">S/ {fmt2(r.monto_factura)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">S/ {fmt2(r.monto_retencion)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-cyan-900">
                        S/ {fmt2(r.monto_cobrado != null ? r.monto_cobrado : neto(r.monto_factura, r.monto_retencion))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-0.5">
                          {etiquetaMedioRow(r)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900 font-medium text-xs mr-3"
                          onClick={() => setModal({ open: true, mode: 'edit', row: r })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Modificar
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-xs"
                          onClick={() => setDeleteRow(r)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      <CobranzaFormModal
        open={modal.open}
        mode={modal.mode}
        initialRow={modal.row}
        clientes={clientes}
        tiposCobranza={tiposCobranza}
        onClose={cerrarModal}
        onGuardado={cargar}
      />
      <ConfirmDeleteModal
        open={!!deleteRow}
        row={deleteRow}
        onClose={() => !deleting && setDeleteRow(null)}
        onConfirm={onConfirmDelete}
        loading={deleting}
      />
    </div>
  )
}
