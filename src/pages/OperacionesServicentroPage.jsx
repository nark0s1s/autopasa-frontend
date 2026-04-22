import { useState, useEffect, useCallback, useMemo } from 'react'
import { Store, Plus, Pencil, Trash2, X } from 'lucide-react'
import {
  listarVentasServicentroPendientes,
  crearVentaServicentroPendiente,
  actualizarVentaServicentroPendiente,
  eliminarVentaServicentroPendiente,
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

/** Misma convención que cobranzas: catálogo COB_* en tipo_pago. */
function tiposPagoCobranza(tipos) {
  if (!Array.isArray(tipos)) return []
  return tipos.filter((t) => t.codigo && String(t.codigo).startsWith('COB_'))
}

function etiquetaMedioRow(r) {
  if (r.tipo_pago_nombre) return r.tipo_pago_nombre
  if (r.tipo_pago_codigo) return r.tipo_pago_codigo
  return '—'
}

function VentaServicentroFormModal({ open, mode, initialRow, tiposCobranza, onClose, onGuardado }) {
  const [fechaVenta, setFechaVenta] = useState(() => toYMD(new Date()))
  const [monto, setMonto] = useState('')
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
      setFechaVenta((r.fecha_venta || '').slice(0, 10))
      setMonto(r.monto != null ? String(r.monto) : '')
      setTipoPagoId(r.tipo_pago_id != null ? String(r.tipo_pago_id) : defaultTipoId)
      setConcepto(r.concepto ?? '')
      setObservaciones(r.observaciones ?? '')
    } else {
      setFechaVenta(toYMD(new Date()))
      setMonto('')
      setTipoPagoId(defaultTipoId)
      setConcepto('')
      setObservaciones('')
    }
  }, [open, mode, initialRow, defaultTipoId])

  if (!open) return null

  const totalM = parseFloat(monto)
  const sinCatalogo = tiposCobranza.length === 0

  const submit = async (e) => {
    e.preventDefault()
    if (!Number.isFinite(totalM) || totalM < 0 || !tipoPagoId) return
    const payload = {
      fecha_venta: fechaVenta,
      monto: totalM,
      tipo_pago_id: parseInt(tipoPagoId, 10),
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    }
    try {
      setGuardando(true)
      if (mode === 'edit' && initialRow?.id) {
        await actualizarVentaServicentroPendiente(initialRow.id, payload)
      } else {
        await crearVentaServicentroPendiente(payload)
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
        aria-labelledby="vs-modal-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 id="vs-modal-title" className="text-lg font-semibold text-gray-900">
              {mode === 'edit' ? 'Modificar venta servicentro' : 'Nueva venta servicentro'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pendiente de consolidación. Medio de pago desde catálogo tipo_pago (códigos COB_*).
            </p>
          </div>
          <button type="button" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de venta</label>
            <input type="date" className="input w-full" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto (S/)</label>
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
          <div className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100/80 px-4 py-3">
            <label className="block text-xs font-medium text-teal-900 mb-1">Medio de pago (catálogo)</label>
            {sinCatalogo ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-2">
                No hay tipos COB_* en tipo_pago. Ejecute la migración SQL que inserta COB_EFECTIVO, COB_TRANSFERENCIA,
                COB_CHEQUE (y tarjetas si aplica).
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
            <button type="submit" className="btn btn-primary flex-1" disabled={guardando || sinCatalogo || !tipoPagoId}>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar venta servicentro</h3>
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar la venta del {String(row.fecha_venta || '').slice(0, 10)} por S/ {fmt2(row.monto)}?
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

export default function OperacionesServicentroPage() {
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return toYMD(d)
  })
  const [fechaHasta, setFechaHasta] = useState(() => toYMD(new Date()))
  const [rows, setRows] = useState([])
  const [tiposPago, setTiposPago] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, mode: 'create', row: null })
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const tiposCobranza = useMemo(() => tiposPagoCobranza(tiposPago), [tiposPago])

  useEffect(() => {
    getTiposPago(true)
      .then((d) => setTiposPago(Array.isArray(d) ? d : []))
      .catch(() => setTiposPago([]))
  }, [])

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

  const cerrarModal = () => setModal({ open: false, mode: 'create', row: null })

  const onConfirmDelete = async () => {
    if (!deleteRow) return
    try {
      setDeleting(true)
      await eliminarVentaServicentroPendiente(deleteRow.id)
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
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/25">
                <Store className="w-6 h-6" />
              </span>
              Operaciones — Venta servicentro
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              Registre ventas por día con medio de pago (catálogo). Quedan pendientes hasta que una consolidación incluya
              el rango de fechas y las vincule al cuadre.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center justify-center gap-2 self-start shadow-md"
            onClick={() => setModal({ open: true, mode: 'create', row: null })}
          >
            <Plus className="w-4 h-4" />
            Nueva venta
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
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Ventas pendientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha venta</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium">Medio (catálogo)</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Obs.</th>
                  <th className="px-4 py-3 font-medium text-right w-[1%] whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Sin registros pendientes en el rango. Use &quot;Nueva venta&quot; para agregar.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-teal-50/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-800">{(r.fecha_venta || '').slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">S/ {fmt2(r.monto)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-0.5">
                          {etiquetaMedioRow(r)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-gray-700" title={r.concepto || ''}>
                        {r.concepto || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-gray-500 text-xs" title={r.observaciones || ''}>
                        {r.observaciones || '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium text-xs mr-3"
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

      <VentaServicentroFormModal
        open={modal.open}
        mode={modal.mode}
        initialRow={modal.row}
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
