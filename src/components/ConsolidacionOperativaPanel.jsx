import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Lock,
  AlertTriangle,
  CheckCircle,
  Fuel,
  Flame,
  Package,
  CreditCard,
  FileText,
  Store,
  Wallet,
  LayoutList,
  Calculator,
  Landmark,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import EtiquetaTurnoConfig from './EtiquetaTurnoConfig'
import {
  obtenerConsolidacionVistaOperativa,
  cerrarConsolidacionLiquidacion,
  crearConsolidacionVentaServicentro,
  actualizarConsolidacionVentaServicentro,
  eliminarConsolidacionVentaServicentro,
  crearConsolidacionCobranza,
  actualizarConsolidacionCobranza,
  eliminarConsolidacionCobranza,
  downloadConsolidacionReportePdf,
  getClientesAdmin,
  listarTurnosLiquidacionReferenciaConsolidacion,
  listarVentasServicentroDisponiblesConsolidacion,
  listarCobranzasDisponiblesConsolidacion,
  vincularVentaServicentroConsolidacion,
  vincularCobranzaConsolidacion,
  getTiposPago,
} from '../utils/api'

const TAB_CONFIG = [
  { id: 'cuadre_general', label: 'Cuadre general', icon: Calculator, readOnly: true },
  { id: 'cuadre_efectivo_banco', label: 'Cuadre efectivo banco', icon: Landmark, readOnly: true },
  { id: 'resumen', label: 'Turnos incluidos', icon: LayoutList, readOnly: true },
  { id: 'combustible', label: 'Combustible', icon: Fuel, readOnly: true },
  { id: 'productos', label: 'Venta productos', icon: Package, readOnly: true },
  { id: 'gnv', label: 'GNV', icon: Flame, readOnly: true },
  { id: 'ventas_pos', label: 'Ventas POS', icon: CreditCard, readOnly: true },
  { id: 'guias', label: 'Guías crédito / remisión', icon: FileText, readOnly: true },
  { id: 'venta_servicentro', label: 'Venta servicentro', icon: Store, readOnly: false },
  { id: 'cobranzas', label: 'Cobranzas', icon: Wallet, readOnly: false },
]

/** Montos en soles (efectivo): separador de miles, 2 decimales (es-PE). */
function fmtMonto(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '0.00'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(x)
}

/** Cantidades (unidades, galones en tablas auxiliares), no soles. */
function fmtCantidad(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '0'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(x)
}

function toYMD(d) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

function ModalVentaServicentro({ fila, onClose, onGuardar }) {
  const [fechaVenta, setFechaVenta] = useState(() => toYMD(new Date()))
  const [monto, setMonto] = useState('')
  const [mEf, setMEf] = useState('')
  const [mPos, setMPos] = useState('')
  const [mCred, setMCred] = useState('')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (fila) {
      setFechaVenta((fila.fecha_venta || '').slice(0, 10) || toYMD(new Date()))
      setMonto(fila.monto != null ? String(fila.monto) : '')
      const tot = Number(fila.monto) || 0
      const hasSplit =
        fila.monto_efectivo != null &&
        (Number(fila.monto_pos) > 0 || Number(fila.monto_credito) > 0 || Number(fila.monto_efectivo) !== tot)
      if (hasSplit || (fila.monto_efectivo != null && fila.monto_efectivo !== undefined)) {
        setMEf(fila.monto_efectivo != null ? String(fila.monto_efectivo) : '')
        setMPos(fila.monto_pos != null ? String(fila.monto_pos) : '0')
        setMCred(fila.monto_credito != null ? String(fila.monto_credito) : '0')
      } else {
        setMEf(fila.monto != null ? String(fila.monto) : '')
        setMPos('0')
        setMCred('0')
      }
      setConcepto(fila.concepto ?? '')
      setObservaciones(fila.observaciones ?? '')
    } else {
      setFechaVenta(toYMD(new Date()))
      setMonto('')
      setMEf('')
      setMPos('')
      setMCred('')
      setConcepto('')
      setObservaciones('')
    }
  }, [fila])

  const totalM = Number(monto) || 0
  const sumDesglose = (Number(mEf) || 0) + (Number(mPos) || 0) + (Number(mCred) || 0)
  const desgloseOk = totalM > 0 && Math.abs(sumDesglose - totalM) < 0.01

  const submit = (e) => {
    e.preventDefault()
    if (!desgloseOk) return
    onGuardar({
      fecha_venta: fechaVenta,
      monto: totalM,
      monto_efectivo: Number(mEf) || 0,
      monto_pos: Number(mPos) || 0,
      monto_credito: Number(mCred) || 0,
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="card p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{fila ? 'Editar venta servicentro' : 'Nueva venta servicentro'}</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Día de venta</label>
            <input
              type="date"
              className="input w-full"
              value={fechaVenta}
              onChange={(e) => setFechaVenta(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto total (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={monto}
              onChange={(e) => {
                const v = e.target.value
                setMonto(v)
                const n = parseFloat(v)
                if (Number.isFinite(n)) {
                  setMEf(String(n))
                  setMPos('0')
                  setMCred('0')
                }
              }}
              required
            />
          </div>
          <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-teal-900">Desglose (cuadre banco: solo efectivo va al depósito)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">Efectivo</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full text-sm"
                  value={mEf}
                  onChange={(e) => setMEf(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">POS</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full text-sm"
                  value={mPos}
                  onChange={(e) => setMPos(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">Crédito</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input w-full text-sm"
                  value={mCred}
                  onChange={(e) => setMCred(e.target.value)}
                />
              </div>
            </div>
            <p className={`text-xs ${desgloseOk ? 'text-teal-800' : 'text-red-600'}`}>
              Suma desglose: S/ {fmtMonto(sumDesglose)}
              {totalM > 0 && !desgloseOk && ' · Debe coincidir con el monto total'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (opcional)</label>
            <input type="text" className="input w-full" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea className="input w-full min-h-[72px]" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!desgloseOk}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function montoCobradoLocal(factura, retencion) {
  const f = Number(factura) || 0
  const r = Number(retencion) || 0
  return Math.max(0, f - r)
}

function tiposPagoCobranzaCatalogo(tipos) {
  if (!Array.isArray(tipos)) return []
  return tipos.filter((t) => t.codigo && String(t.codigo).startsWith('COB_'))
}

function ModalCobranza({ fila, onClose, onGuardar }) {
  const [fechaCobranza, setFechaCobranza] = useState(() => toYMD(new Date()))
  const [numeroFactura, setNumeroFactura] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clientes, setClientes] = useState([])
  const [tiposPago, setTiposPago] = useState([])
  const [montoFactura, setMontoFactura] = useState('')
  const [montoRetencion, setMontoRetencion] = useState('0')
  const [tipoPagoId, setTipoPagoId] = useState('')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const tiposCob = useMemo(() => tiposPagoCobranzaCatalogo(tiposPago), [tiposPago])
  const defaultTipoId = useMemo(() => {
    const ef = tiposCob.find((t) => t.codigo === 'COB_EFECTIVO')
    return ef ? String(ef.id) : tiposCob[0] ? String(tiposCob[0].id) : ''
  }, [tiposCob])

  useEffect(() => {
    getClientesAdmin(true)
      .then((d) => setClientes(Array.isArray(d) ? d : []))
      .catch(() => setClientes([]))
    getTiposPago(true)
      .then((d) => setTiposPago(Array.isArray(d) ? d : []))
      .catch(() => setTiposPago([]))
  }, [])

  useEffect(() => {
    if (fila) {
      setFechaCobranza((fila.fecha_cobranza || '').slice(0, 10) || toYMD(new Date()))
      setNumeroFactura(fila.numero_factura ?? '')
      setClienteId(fila.cliente_id != null ? String(fila.cliente_id) : '')
      setMontoFactura(fila.monto_factura != null ? String(fila.monto_factura) : '')
      setMontoRetencion(fila.monto_retencion != null ? String(fila.monto_retencion) : '0')
      setTipoPagoId(fila.tipo_pago_id != null ? String(fila.tipo_pago_id) : defaultTipoId)
      setConcepto(fila.concepto ?? '')
      setObservaciones(fila.observaciones ?? '')
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
  }, [fila, defaultTipoId])

  const neto = montoCobradoLocal(montoFactura, montoRetencion)
  const sinCatalogo = tiposCob.length === 0

  const submit = (e) => {
    e.preventDefault()
    const mf = parseFloat(montoFactura)
    const mr = parseFloat(montoRetencion) || 0
    if (mr > mf || !tipoPagoId) {
      return
    }
    onGuardar({
      fecha_cobranza: fechaCobranza,
      numero_factura: numeroFactura.trim() || null,
      cliente_id: clienteId ? parseInt(clienteId, 10) : null,
      monto_factura: mf,
      monto_retencion: mr,
      tipo_pago_id: parseInt(tipoPagoId, 10),
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    })
  }

  const retMayor = (parseFloat(montoRetencion) || 0) > (parseFloat(montoFactura) || 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{fila ? 'Editar cobranza' : 'Nueva cobranza'}</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de cobranza</label>
            <input
              type="date"
              className="input w-full"
              value={fechaCobranza}
              onChange={(e) => setFechaCobranza(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nº factura (opcional)</label>
            <input type="text" className="input w-full" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto factura cobrada (S/)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto retención (S/)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={montoRetencion}
              onChange={(e) => setMontoRetencion(e.target.value)}
            />
            {retMayor && <p className="text-xs text-red-600 mt-1">La retención no puede ser mayor al monto de la factura.</p>}
          </div>
          <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
            <p className="text-xs text-teal-900 font-medium">Monto cobrado (factura − retención)</p>
            <p className="text-lg font-bold text-teal-800">S/ {fmtMonto(neto)}</p>
          </div>
          <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-cyan-900">Medio de pago (catálogo tipo_pago)</p>
            {sinCatalogo ? (
              <p className="text-xs text-amber-800">No hay tipos COB_* en catálogo. Ejecute la migración SQL correspondiente.</p>
            ) : (
              <select className="input w-full text-sm" value={tipoPagoId} onChange={(e) => setTipoPagoId(e.target.value)} required>
                {tiposCob.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre || t.codigo}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-cyan-800">Solo efectivo (COB_EFECTIVO) suma al depósito; transferencia y cheque son referencia.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (opcional)</label>
            <input type="text" className="input w-full" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea className="input w-full min-h-[72px]" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={retMayor || sinCatalogo || !tipoPagoId}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ConsolidacionOperativaPanel({ consolidacionId, onClose, onMensaje, onCerrada }) {
  const [detalle, setDetalle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState('cuadre_general')
  const [cerrando, setCerrando] = useState(false)
  const [modalConfirmarCerrar, setModalConfirmarCerrar] = useState(false)
  /** Tras cerrar OK: popup explícito antes de volver al listado (evita solo toast / sensación de alert). */
  const [modalExitoCerrar, setModalExitoCerrar] = useState(null)
  const [edicion, setEdicion] = useState(null)
  const [eliminar, setEliminar] = useState(null)
  const [disponiblesVs, setDisponiblesVs] = useState([])
  const [disponiblesCb, setDisponiblesCb] = useState([])
  const [refsTl, setRefsTl] = useState([])
  const [loadingDisp, setLoadingDisp] = useState(false)
  const [tlVincCb, setTlVincCb] = useState('')

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const d = await obtenerConsolidacionVistaOperativa(consolidacionId)
      setDetalle(d)
      if (d?.estado === 'pendiente') {
        try {
          setLoadingDisp(true)
          const [refs, vs, cb] = await Promise.all([
            listarTurnosLiquidacionReferenciaConsolidacion(consolidacionId),
            listarVentasServicentroDisponiblesConsolidacion(consolidacionId),
            listarCobranzasDisponiblesConsolidacion(consolidacionId),
          ])
          setRefsTl(Array.isArray(refs) ? refs : [])
          setDisponiblesVs(Array.isArray(vs) ? vs : [])
          setDisponiblesCb(Array.isArray(cb) ? cb : [])
        } catch {
          setRefsTl([])
          setDisponiblesVs([])
          setDisponiblesCb([])
        } finally {
          setLoadingDisp(false)
        }
      } else {
        setRefsTl([])
        setDisponiblesVs([])
        setDisponiblesCb([])
      }
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'Error al cargar la consolidación', 'error')
      setDetalle(null)
      setRefsTl([])
      setDisponiblesVs([])
      setDisponiblesCb([])
    } finally {
      setLoading(false)
    }
  }, [consolidacionId, onMensaje])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pendiente = detalle?.estado === 'pendiente'

  const disponiblesVsPorDia = useMemo(() => {
    const map = new Map()
    for (const r of disponiblesVs) {
      const key = (r.fecha_venta || '').slice(0, 10) || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
  }, [disponiblesVs])

  const totales = useMemo(() => {
    const vs = detalle?.ventas_servicentro || []
    const cob = detalle?.cobranzas || []
    const sumVs = vs.reduce((s, x) => s + Number(x.monto || 0), 0)
    const sumVsEfectivo = vs.reduce((s, x) => {
      const ef = x.monto_efectivo != null ? Number(x.monto_efectivo) : Number(x.monto || 0)
      return s + ef
    }, 0)
    const sumVsPos = vs.reduce((s, x) => s + Number(x.monto_pos || 0), 0)
    const sumVsCredito = vs.reduce((s, x) => s + Number(x.monto_credito || 0), 0)
    const sumFactura = cob.reduce((s, x) => s + Number(x.monto_factura || 0), 0)
    const sumRet = cob.reduce((s, x) => s + Number(x.monto_retencion || 0), 0)
    const sumNeto = cob.reduce((s, x) => {
      const mc = x.monto_cobrado != null ? Number(x.monto_cobrado) : montoCobradoLocal(x.monto_factura, x.monto_retencion)
      return s + mc
    }, 0)
    const netoCob = (x) =>
      x.monto_cobrado != null ? Number(x.monto_cobrado) : montoCobradoLocal(x.monto_factura, x.monto_retencion)
    const sumCobranzaEfectivo = cob.reduce((s, x) => {
      if (x.tipo_pago_codigo === 'COB_EFECTIVO') return s + netoCob(x)
      return s
    }, 0)
    const sumCobranzaTransferencia = cob.reduce((s, x) => {
      if (x.tipo_pago_codigo === 'COB_TRANSFERENCIA') return s + netoCob(x)
      return s
    }, 0)
    const sumCobranzaCheque = cob.reduce((s, x) => {
      if (x.tipo_pago_codigo === 'COB_CHEQUE') return s + netoCob(x)
      return s
    }, 0)
    const comb = detalle?.combustible_por_producto || []
    const sumCombustibleSoles = comb.reduce((s, x) => s + Number(x.total_soles || 0), 0)
    const sumCombustibleGalones = comb.reduce((s, x) => s + Number(x.total_galones || 0), 0)
    const gnvBloques = detalle?.gnv_por_turno || []
    let sumVentaGnv = 0
    let sumFinanciacionGnv = 0
    for (const b of gnvBloques) {
      for (const v of b.ventas_gnv || []) sumVentaGnv += Number(v.venta_total_soles || 0)
      for (const f of b.financiaciones_gnv || []) sumFinanciacionGnv += Number(f.monto_soles || 0)
    }
    const sumGnvEfectivo = sumVentaGnv + sumFinanciacionGnv
    /* Cuadre general: GNV = solo venta (sin financiación). */
    const sumGnvCuadre = sumVentaGnv
    const vProd = detalle?.venta_productos_por_producto || []
    const sumProductosSoles = vProd.reduce((s, x) => s + Number(x.total_soles || 0), 0)
    const sumProductosCantidad = vProd.reduce((s, x) => s + Number(x.total_cantidad || 0), 0)
    const guiasBloques = detalle?.guias_por_turno || []
    let sumGuiasCredito = 0
    let sumGuiasRemision = 0
    for (const b of guiasBloques) {
      for (const g of b.guias_credito || []) sumGuiasCredito += Number(g.monto || 0)
      for (const g of b.guias_remision || []) sumGuiasRemision += Number(g.monto || 0)
    }
    const sumVentasCreditoTotal = sumGuiasCredito + sumGuiasRemision
    const turnos = detalle?.turnos || []
    const sumDescuentosTurnos = turnos.reduce((s, t) => s + Number(t.total_descuentos ?? 0), 0)
    const subtotalCombustibleYGnv = sumCombustibleSoles + sumGnvCuadre
    const cuadreFinal =
      subtotalCombustibleYGnv +
      sumProductosSoles +
      sumVs +
      sumNeto -
      sumDescuentosTurnos -
      sumVentasCreditoTotal
    const sumEfectivoTurnosEntregado = Number(detalle?.suma_efectivo_entregado || 0)
    const cuadreEfectivoBanco = sumEfectivoTurnosEntregado + sumVsEfectivo + sumCobranzaEfectivo
    return {
      sumVs,
      sumVsEfectivo,
      sumVsPos,
      sumVsCredito,
      sumFactura,
      sumRet,
      sumNeto,
      sumCobranzaEfectivo,
      sumCobranzaTransferencia,
      sumCobranzaCheque,
      sumCombustibleSoles,
      sumCombustibleGalones,
      sumVentaGnv,
      sumFinanciacionGnv,
      sumGnvEfectivo,
      sumGnvCuadre,
      sumProductosSoles,
      sumProductosCantidad,
      sumGuiasCredito,
      sumGuiasRemision,
      sumVentasCreditoTotal,
      sumDescuentosTurnos,
      subtotalCombustibleYGnv,
      cuadreFinal,
      sumEfectivoTurnosEntregado,
      cuadreEfectivoBanco,
    }
  }, [detalle])

  const ejecutarCerrarConsolidacion = async () => {
    if (!pendiente || !detalle) return
    const codigoCons = detalle.codigo
    try {
      setCerrando(true)
      setModalConfirmarCerrar(false)
      await cerrarConsolidacionLiquidacion(consolidacionId)
      await cargar()
      onCerrada?.()
      setModalExitoCerrar({ codigo: codigoCons })
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'No se pudo cerrar', 'error')
    } finally {
      setCerrando(false)
    }
  }

  const cerrarModalExitoCerrar = () => {
    setModalExitoCerrar(null)
    onClose()
  }

  const guardarVenta = async (payload) => {
    try {
      if (edicion?.fila?.id) {
        await actualizarConsolidacionVentaServicentro(edicion.fila.id, payload)
        onMensaje('Registro actualizado')
      } else {
        await crearConsolidacionVentaServicentro(consolidacionId, payload)
        onMensaje('Registro agregado')
      }
      setEdicion(null)
      await cargar()
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'Error al guardar', 'error')
    }
  }

  const guardarCobranza = async (payload) => {
    try {
      if (edicion?.fila?.id) {
        await actualizarConsolidacionCobranza(edicion.fila.id, payload)
        onMensaje('Registro actualizado')
      } else {
        await crearConsolidacionCobranza(consolidacionId, payload)
        onMensaje('Registro agregado')
      }
      setEdicion(null)
      await cargar()
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'Error al guardar', 'error')
    }
  }

  const confirmEliminar = async () => {
    if (!eliminar) return
    try {
      if (eliminar.tipo === 'venta_servicentro') {
        await eliminarConsolidacionVentaServicentro(eliminar.id)
      } else {
        await eliminarConsolidacionCobranza(eliminar.id)
      }
      onMensaje('Registro eliminado')
      setEliminar(null)
      await cargar()
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'Error al eliminar', 'error')
    }
  }

  const vincularVentaDisp = async (rowId) => {
    try {
      await vincularVentaServicentroConsolidacion(consolidacionId, rowId, {})
      onMensaje('Venta servicentro incluida en esta consolidación')
      await cargar()
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'No se pudo incluir la venta', 'error')
    }
  }

  const vincularCobranzaDisp = async (rowId) => {
    try {
      const body = {}
      if (tlVincCb) body.turno_liquidacion_id = parseInt(tlVincCb, 10)
      await vincularCobranzaConsolidacion(consolidacionId, rowId, body)
      onMensaje('Cobranza incluida en esta consolidación')
      await cargar()
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'No se pudo incluir la cobranza', 'error')
    }
  }

  const abrirPdf = async () => {
    try {
      await downloadConsolidacionReportePdf(detalle.id, detalle.codigo)
    } catch (e) {
      onMensaje('No se pudo descargar el PDF', 'error')
    }
  }

  const renderTablaVentasServicentro = () => {
    const rows = detalle?.ventas_servicentro || []
    return (
      <div className="space-y-8">
        {pendiente && (
          <div className="border border-dashed border-teal-200 rounded-lg p-4 bg-teal-50/40">
            <h4 className="text-sm font-semibold text-teal-900 mb-1">Disponibles (Operaciones — venta servicentro)</h4>
            <p className="text-xs text-gray-600 mb-3">
              Ventas pendientes ingresadas en <strong className="text-gray-800">/operaciones/ventas-servicentro</strong>,
              agrupadas por día de venta. Incluya en esta consolidación las que correspondan (no dependen de turnos de
              grifero).
            </p>
            {loadingDisp ? (
              <p className="text-xs text-gray-500">Cargando disponibles…</p>
            ) : disponiblesVs.length === 0 ? (
              <p className="text-xs text-gray-500">No hay ventas servicentro pendientes de vincular.</p>
            ) : (
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {disponiblesVsPorDia.map(([dia, lista]) => (
                  <div key={dia}>
                    <p className="text-xs font-semibold text-teal-800 mb-2 sticky top-0 bg-teal-50/95 py-0.5">
                      {dia === '—'
                        ? 'Sin fecha'
                        : format(new Date(dia + 'T12:00:00'), 'EEEE d MMM yyyy', { locale: es })}
                    </p>
                    <ul className="space-y-2">
                      {lista.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap justify-between gap-2 items-start bg-white border border-teal-100 rounded-lg p-2 text-sm"
                        >
                          <div>
                            <p className="text-xs text-gray-500">{r.empleado_nombre ? r.empleado_nombre : '—'}</p>
                            <p className="font-semibold text-teal-900">S/ {fmtMonto(r.monto)}</p>
                            {r.concepto && <p className="text-xs text-gray-700">{r.concepto}</p>}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm shrink-0"
                            onClick={() => vincularVentaDisp(r.id)}
                          >
                            Incluir
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Incluidas en esta consolidación</h4>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              Total:{' '}
              <strong className="text-gray-900">S/ {fmtMonto(totales.sumVs)}</strong>
            </p>
            {pendiente && (
              <button
                type="button"
                className="btn btn-primary btn-sm inline-flex items-center gap-1"
                onClick={() => setEdicion({ tipo: 'venta_servicentro', fila: null })}
              >
                <Plus className="w-4 h-4" />
                Agregar manual
              </button>
            )}
          </div>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Sin registros incluidos.</p>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {r.fecha_venta
                        ? format(new Date(String(r.fecha_venta).slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
                        : '—'}
                    </p>
                    <p className="font-semibold">S/ {fmtMonto(r.monto)}</p>
                    <p className="text-xs text-gray-600 tabular-nums">
                      Ef. S/ {fmtMonto(r.monto_efectivo ?? r.monto)} · POS S/ {fmtMonto(r.monto_pos ?? 0)} · Créd. S/ {fmtMonto(r.monto_credito ?? 0)}
                    </p>
                    {r.empleado_nombre && <p className="text-xs text-gray-600">Registró: {r.empleado_nombre}</p>}
                    {r.concepto && <p className="text-sm text-gray-700">{r.concepto}</p>}
                    {r.observaciones && <p className="text-xs text-gray-500">{r.observaciones}</p>}
                  </div>
                  {pendiente && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm p-1"
                        title="Editar"
                        onClick={() => setEdicion({ tipo: 'venta_servicentro', fila: r })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm p-1"
                        title="Eliminar"
                        onClick={() => setEliminar({ tipo: 'venta_servicentro', id: r.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderTablaCobranzas = () => {
    const rows = detalle?.cobranzas || []
    return (
      <div className="space-y-8">
        {pendiente && (
          <div className="border border-dashed border-cyan-200 rounded-lg p-4 bg-cyan-50/40">
            <h4 className="text-sm font-semibold text-cyan-900 mb-1">Disponibles (Operaciones — cobranzas)</h4>
            <p className="text-xs text-gray-600 mb-3">
              Registros pendientes cuya fecha está entre las liquidaciones de los turnos incluidos. Inclúyalos en esta
              consolidación.
            </p>
            {refsTl.length > 0 && (
              <div className="mb-3 max-w-lg">
                <label className="block text-xs text-gray-600 mb-1">Liquidación de referencia al incluir</label>
                <select className="input w-full text-sm" value={tlVincCb} onChange={(e) => setTlVincCb(e.target.value)}>
                  <option value="">Inferir por fecha del registro</option>
                  {refsTl.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} ·{' '}
                      {t.fecha
                        ? format(new Date(String(t.fecha).slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
                        : ''}{' '}
                      · {t.turno_config_etiqueta || '—'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {loadingDisp ? (
              <p className="text-xs text-gray-500">Cargando disponibles…</p>
            ) : disponiblesCb.length === 0 ? (
              <p className="text-xs text-gray-500">No hay cobranzas pendientes en el rango de fechas de esta consolidación.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {disponiblesCb.map((r) => {
                  const neto =
                    r.monto_cobrado != null ? Number(r.monto_cobrado) : montoCobradoLocal(r.monto_factura, r.monto_retencion)
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap justify-between gap-2 items-start bg-white border border-cyan-100 rounded-lg p-2 text-sm"
                    >
                      <div>
                        <p className="text-xs text-gray-500">
                          {r.fecha_cobranza
                            ? format(new Date(String(r.fecha_cobranza).slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', {
                                locale: es,
                              })
                            : '—'}
                          {r.numero_factura ? ` · Fact. ${r.numero_factura}` : ''}
                          {r.cliente_razon_social ? ` · ${r.cliente_razon_social}` : ''}
                          {r.empleado_nombre ? ` · ${r.empleado_nombre}` : ''}
                        </p>
                        <p className="font-semibold text-cyan-900">Neto S/ {fmtMonto(neto)}</p>
                        <p className="text-xs text-gray-600">
                          Fact. S/ {fmtMonto(r.monto_factura)} · Ret. S/ {fmtMonto(r.monto_retencion)}
                        </p>
                      </div>
                      <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => vincularCobranzaDisp(r.id)}>
                        Incluir
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Incluidas en esta consolidación</h4>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>
                Σ Monto cobrado (neto):{' '}
                <strong className="text-gray-900">S/ {fmtMonto(totales.sumNeto)}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Facturas S/ {fmtMonto(totales.sumFactura)} · Retenciones S/ {fmtMonto(totales.sumRet)}
              </p>
            </div>
            {pendiente && (
              <button
                type="button"
                className="btn btn-primary btn-sm inline-flex items-center gap-1 self-start sm:self-auto"
                onClick={() => setEdicion({ tipo: 'cobranzas', fila: null })}
              >
                <Plus className="w-4 h-4" />
                Agregar manual
              </button>
            )}
          </div>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Sin registros incluidos.</p>
            ) : (
              rows.map((r) => {
                const neto =
                  r.monto_cobrado != null ? Number(r.monto_cobrado) : montoCobradoLocal(r.monto_factura, r.monto_retencion)
                return (
                  <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-2">
                    <div className="text-sm space-y-1">
                      <p className="text-xs text-gray-500">
                        {r.fecha_cobranza
                          ? format(new Date(String(r.fecha_cobranza).slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
                          : '—'}
                        {r.turno_liquidacion_codigo ? (
                          <>
                            {' '}
                            · Liq. <span className="font-mono">{r.turno_liquidacion_codigo}</span>
                            {r.turno_config_etiqueta ? (
                              <>
                                {' '}
                                (
                                <EtiquetaTurnoConfig texto={r.turno_config_etiqueta} className="inline" />
                                )
                              </>
                            ) : null}
                          </>
                        ) : null}
                        {r.numero_factura ? (
                          <>
                            {' '}
                            · Fact. <span className="font-mono">{r.numero_factura}</span>
                          </>
                        ) : null}
                        {r.cliente_razon_social ? (
                          <>
                            {' '}
                            · {r.cliente_razon_social}
                          </>
                        ) : null}
                      </p>
                      {r.empleado_nombre && <p className="text-xs text-gray-600">Registró: {r.empleado_nombre}</p>}
                      <p>
                        <span className="text-gray-600">Monto factura:</span>{' '}
                        <span className="font-semibold">S/ {fmtMonto(r.monto_factura)}</span>
                        <span className="text-gray-500 mx-2">·</span>
                        <span className="text-gray-600">Retención:</span>{' '}
                        <span className="font-medium">S/ {fmtMonto(r.monto_retencion)}</span>
                      </p>
                      <p className="text-teal-800 font-semibold">Monto cobrado: S/ {fmtMonto(neto)}</p>
                      <p className="text-xs text-gray-600">
                        Medio (catálogo): <span className="font-medium">{r.tipo_pago_nombre || r.tipo_pago_codigo || '—'}</span>
                      </p>
                      {r.concepto && <p className="text-gray-700">{r.concepto}</p>}
                      {r.observaciones && <p className="text-xs text-gray-500">{r.observaciones}</p>}
                    </div>
                    {pendiente && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm p-1"
                          title="Editar"
                          onClick={() => setEdicion({ tipo: 'cobranzas', fila: r })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm p-1"
                          title="Eliminar"
                          onClick={() => setEliminar({ tipo: 'cobranzas', id: r.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="card p-8 text-center">Cargando…</div>
      </div>
    )
  }

  if (!detalle) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="card p-6 max-w-md">
          <p className="text-gray-700 mb-4">No se pudo cargar la consolidación.</p>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {modalExitoCerrar && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-exito-cerrar-cons"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalExitoCerrar()
          }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-md w-full">
            <div className="flex gap-3 mb-4">
              <div className="p-2 rounded-full bg-green-100 text-green-700 shrink-0">
                <CheckCircle className="w-7 h-7" aria-hidden />
              </div>
              <div>
                <h3 id="titulo-exito-cerrar-cons" className="text-lg font-semibold text-gray-900">
                  Consolidación cerrada
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  La consolidación quedó registrada como <strong className="text-gray-800">cerrada</strong>. Ya no podrá
                  editar ventas servicentro ni cobranzas en este documento.
                </p>
              </div>
            </div>
            <dl className="text-sm space-y-2 mb-5 border border-gray-100 rounded-lg p-3 bg-gray-50/80">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Código</dt>
                <dd className="font-mono font-medium text-gray-900">{modalExitoCerrar.codigo}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={cerrarModalExitoCerrar}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {modalConfirmarCerrar && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmar-cerrar-cons"
        >
          <div className="card p-6 max-w-md w-full shadow-xl">
            <div className="flex gap-3 mb-3">
              <div className="p-2 rounded-full bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="w-6 h-6" aria-hidden />
              </div>
              <div>
                <h3 id="titulo-confirmar-cerrar-cons" className="text-lg font-semibold text-gray-900">
                  ¿Cerrar esta consolidación?
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  No podrá agregar ni editar ventas de servicentro ni cobranzas asociadas a esta consolidación después
                  de cerrarla.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setModalConfirmarCerrar(false)}
                disabled={cerrando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={ejecutarCerrarConsolidacion}
                disabled={cerrando}
              >
                {cerrando ? 'Cerrando…' : 'Sí, cerrar consolidación'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
        <div className="min-h-full flex justify-center p-4 py-8">
          <div className="card w-full max-w-5xl shadow-xl">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex flex-wrap justify-between gap-3 items-start">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">Consolidación {detalle.codigo}</h2>
                  {pendiente ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">Pendiente</span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-800 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Cerrada
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {detalle.registrado_en
                    ? format(new Date(detalle.registrado_en), 'dd/MM/yyyy HH:mm', { locale: es })
                    : ''}
                  {detalle.cerrada_en && !pendiente
                    ? ` · Cerrada: ${format(new Date(detalle.cerrada_en), 'dd/MM/yyyy HH:mm', { locale: es })}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {pendiente && (
                  <button
                    type="button"
                    className="btn btn-primary inline-flex items-center gap-2"
                    onClick={() => setModalConfirmarCerrar(true)}
                    disabled={cerrando}
                  >
                    Cerrar consolidación
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={abrirPdf}>
                  PDF
                </button>
                <button type="button" className="p-2 text-gray-400 hover:text-gray-700" onClick={onClose} aria-label="Cerrar">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-5 border-b border-gray-100 bg-primary-50/40">
              <p className="text-xs font-semibold text-primary-900 uppercase tracking-wide mb-3">Totalizadores</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <p className="text-xs text-gray-600">Combustible</p>
                  <p className="text-lg font-bold text-amber-900">S/ {fmtMonto(totales.sumCombustibleSoles)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Σ galones {Number(totales.sumCombustibleGalones || 0).toFixed(3)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="text-xs text-gray-600">GNV (sin financiación)</p>
                  <p className="text-lg font-bold text-orange-900">S/ {fmtMonto(totales.sumGnvCuadre)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Financiación (no en cuadre): S/ {fmtMonto(totales.sumFinanciacionGnv)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-violet-100">
                  <p className="text-xs text-gray-600">Venta productos</p>
                  <p className="text-lg font-bold text-violet-900">S/ {fmtMonto(totales.sumProductosSoles)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Σ cantidad {fmtCantidad(totales.sumProductosCantidad)} u.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-teal-100">
                  <p className="text-xs text-gray-600">Venta servicentro</p>
                  <p className="text-lg font-bold text-teal-800">S/ {fmtMonto(totales.sumVs)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Ef. S/ {fmtMonto(totales.sumVsEfectivo)} · POS S/ {fmtMonto(totales.sumVsPos)} · Créd. S/ {fmtMonto(totales.sumVsCredito)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-cyan-100">
                  <p className="text-xs text-gray-600">Cobranzas (neto)</p>
                  <p className="text-lg font-bold text-cyan-900">S/ {fmtMonto(totales.sumNeto)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Fact. S/ {fmtMonto(totales.sumFactura)} · Ret. S/ {fmtMonto(totales.sumRet)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    Ef. S/ {fmtMonto(totales.sumCobranzaEfectivo)} · Transf. S/ {fmtMonto(totales.sumCobranzaTransferencia)} · Ch. S/{' '}
                    {fmtMonto(totales.sumCobranzaCheque)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 px-2 overflow-x-auto">
              <nav className="flex min-w-max">
                {TAB_CONFIG.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSubTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      subTab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <t.icon className="w-4 h-4 shrink-0" />
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-5 min-h-[280px]">
              {subTab === 'cuadre_general' && (
                <div className="space-y-4">
                  <section>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Combustible y GNV</h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                          <tr>
                            <th className="p-3">Concepto</th>
                            <th className="p-3 text-right">Galones</th>
                            <th className="p-3 text-right">Soles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detalle.combustible_por_producto || []).length === 0 &&
                          totales.sumGnvCuadre === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-4 text-center text-gray-500">
                                Sin combustible ni GNV en los turnos consolidados.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {(detalle.combustible_por_producto || []).map((row) => (
                                <tr key={row.producto_id} className="border-t border-gray-100">
                                  <td className="p-3">{row.producto_nombre}</td>
                                  <td className="p-3 text-right tabular-nums">{Number(row.total_galones || 0).toFixed(3)}</td>
                                  <td className="p-3 text-right tabular-nums">S/ {fmtMonto(row.total_soles)}</td>
                                </tr>
                              ))}
                              {totales.sumGnvCuadre > 0 && (
                                <tr className="border-t border-gray-100 bg-orange-50/30">
                                  <td className="p-3">GNV (sin financiación)</td>
                                  <td className="p-3 text-right text-gray-400">—</td>
                                  <td className="p-3 text-right tabular-nums">S/ {fmtMonto(totales.sumGnvCuadre)}</td>
                                </tr>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {((detalle.combustible_por_producto || []).length > 0 || totales.sumGnvCuadre > 0) && (
                      <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50/80 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                        <div>
                          <span className="font-semibold text-emerald-900 text-base">Venta de Combustibles</span>
                          <p className="text-xs text-emerald-800/90 mt-0.5">
                            Incluye GNV (sin financiación) · Σ galones combustible{' '}
                            {(detalle.combustible_por_producto || []).length > 0
                              ? Number(totales.sumCombustibleGalones || 0).toFixed(3)
                              : '—'}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-emerald-800 tabular-nums">+ S/ {fmtMonto(totales.subtotalCombustibleYGnv)}</span>
                      </div>
                    )}
                  </section>

                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                    <span className="font-semibold text-sky-950 text-base">Venta de productos</span>
                    <span className="text-xl font-bold text-sky-800 tabular-nums">+ S/ {fmtMonto(totales.sumProductosSoles)}</span>
                  </div>

                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                    <span className="font-semibold text-sky-950 text-base">Venta servicentro</span>
                    <span className="text-xl font-bold text-sky-800 tabular-nums">+ S/ {fmtMonto(totales.sumVs)}</span>
                  </div>

                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                    <span className="font-semibold text-sky-950 text-base">Total cobranzas (neto)</span>
                    <span className="text-xl font-bold text-sky-800 tabular-nums">+ S/ {fmtMonto(totales.sumNeto)}</span>
                  </div>

                  <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 flex flex-wrap justify-between gap-2 items-center">
                    <span className="font-semibold text-red-900 text-base">Descuentos</span>
                    <span className="text-xl font-bold text-red-700 tabular-nums">− S/ {fmtMonto(totales.sumDescuentosTurnos)}</span>
                  </div>

                  <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 flex flex-wrap justify-between gap-2 items-center">
                    <span className="font-semibold text-red-900 text-base">Ventas al crédito</span>
                    <span className="text-xl font-bold text-red-700 tabular-nums">− S/ {fmtMonto(totales.sumVentasCreditoTotal)}</span>
                  </div>

                  <div className="rounded-xl border-2 border-emerald-800 bg-emerald-700 p-5 sm:p-6 space-y-2 shadow-md">
                    <div className="flex flex-wrap justify-between gap-3 items-center">
                      <span className="text-base sm:text-lg font-bold text-white tracking-tight">Cuadre final</span>
                      <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums drop-shadow-sm">
                        S/ {fmtMonto(totales.cuadreFinal)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/95 leading-relaxed border-t border-emerald-600/80 pt-3">
                      Combustible + GNV (sin financiación) + productos + servicentro + cobranzas (neto) − descuentos −
                      ventas al crédito.
                    </p>
                  </div>
                </div>
              )}

              {subTab === 'cuadre_efectivo_banco' && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-700 rounded-lg border border-slate-200 bg-slate-50/80 p-3 leading-relaxed">
                    Cuadre distinto al general: aquí solo suma el <strong>efectivo que iría al banco</strong> — lo
                    contado y entregado en cada turno de grifero, más efectivo de servicentro y de cobranzas. Las ventas
                    POS, crédito y cobranzas por transferencia se muestran solo como referencia (no entran al depósito
                    físico).
                  </p>

                  <section>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                      Efectivo entregado (turnos de grifero)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-left">
                          <tr>
                            <th className="p-3">Turno</th>
                            <th className="p-3 text-right">Efectivo esperado</th>
                            <th className="p-3 text-right">Efectivo entregado</th>
                            <th className="p-3 text-right">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detalle.turnos || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-gray-500">
                                Sin turnos en esta consolidación.
                              </td>
                            </tr>
                          ) : (
                            (detalle.turnos || []).map((t) => (
                              <tr key={t.id} className="border-t border-gray-100">
                                <td className="p-3">
                                  <span className="font-mono text-xs">{t.turno_codigo}</span>
                                  <span className="text-xs block mt-0.5">
                                    <EtiquetaTurnoConfig texto={t.turno_config_etiqueta} />
                                  </span>
                                </td>
                                <td className="p-3 text-right tabular-nums">S/ {fmtMonto(t.efectivo_esperado)}</td>
                                <td className="p-3 text-right tabular-nums font-medium">S/ {fmtMonto(t.efectivo_entregado)}</td>
                                <td className="p-3 text-right tabular-nums text-gray-700">S/ {fmtMonto(t.diferencia)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {(detalle.turnos || []).length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-emerald-50/60 font-semibold">
                              <td className="p-3">Total entregado (va al banco)</td>
                              <td className="p-3 text-right tabular-nums">S/ {fmtMonto(detalle.suma_efectivo_esperado)}</td>
                              <td className="p-3 text-right tabular-nums text-emerald-900">
                                S/ {fmtMonto(totales.sumEfectivoTurnosEntregado)}
                              </td>
                              <td className="p-3 text-right tabular-nums">—</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </section>

                  <section className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4">
                      <h3 className="text-sm font-semibold text-teal-950 mb-2">Venta servicentro</h3>
                      <p className="text-xs text-teal-900/90 mb-3">Solo la columna efectivo suma al depósito.</p>
                      <ul className="text-sm space-y-1 tabular-nums">
                        <li className="flex justify-between gap-2">
                          <span className="text-gray-700">Efectivo (banco)</span>
                          <span className="font-bold text-teal-900">S/ {fmtMonto(totales.sumVsEfectivo)}</span>
                        </li>
                        <li className="flex justify-between gap-2 text-gray-600">
                          <span>POS (referencia)</span>
                          <span>S/ {fmtMonto(totales.sumVsPos)}</span>
                        </li>
                        <li className="flex justify-between gap-2 text-gray-600">
                          <span>Crédito (referencia)</span>
                          <span>S/ {fmtMonto(totales.sumVsCredito)}</span>
                        </li>
                        <li className="flex justify-between gap-2 pt-2 border-t border-teal-200 text-gray-700">
                          <span>Total venta</span>
                          <span>S/ {fmtMonto(totales.sumVs)}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-4">
                      <h3 className="text-sm font-semibold text-cyan-950 mb-2">Cobranzas</h3>
                      <p className="text-xs text-cyan-900/90 mb-3">Solo efectivo suma al depósito; transferencias y cheques van aparte.</p>
                      <ul className="text-sm space-y-1 tabular-nums">
                        <li className="flex justify-between gap-2">
                          <span className="text-gray-700">Efectivo (banco)</span>
                          <span className="font-bold text-cyan-900">S/ {fmtMonto(totales.sumCobranzaEfectivo)}</span>
                        </li>
                        <li className="flex justify-between gap-2 text-gray-600">
                          <span>Transferencia (referencia)</span>
                          <span>S/ {fmtMonto(totales.sumCobranzaTransferencia)}</span>
                        </li>
                        <li className="flex justify-between gap-2 text-gray-600">
                          <span>Cheque (referencia)</span>
                          <span>S/ {fmtMonto(totales.sumCobranzaCheque)}</span>
                        </li>
                        <li className="flex justify-between gap-2 pt-2 border-t border-cyan-200 text-gray-700">
                          <span>Neto total cobranzas</span>
                          <span>S/ {fmtMonto(totales.sumNeto)}</span>
                        </li>
                      </ul>
                    </div>
                  </section>

                  <div className="rounded-xl border-2 border-slate-800 bg-slate-800 p-5 sm:p-6 space-y-2 shadow-md">
                    <div className="flex flex-wrap justify-between gap-3 items-center">
                      <span className="text-base sm:text-lg font-bold text-white tracking-tight">Total efectivo a depositar</span>
                      <span className="text-2xl sm:text-3xl font-bold text-amber-300 tabular-nums drop-shadow-sm">
                        S/ {fmtMonto(totales.cuadreEfectivoBanco)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200/95 leading-relaxed border-t border-slate-600/80 pt-3">
                      Σ efectivo entregado en turnos (S/ {fmtMonto(totales.sumEfectivoTurnosEntregado)}) + efectivo
                      servicentro (S/ {fmtMonto(totales.sumVsEfectivo)}) + efectivo cobranzas (S/ {fmtMonto(totales.sumCobranzaEfectivo)}).
                    </p>
                  </div>
                </div>
              )}

              {subTab === 'resumen' && (
                <div className="space-y-2">
                  {detalle.observaciones && <p className="text-sm p-3 bg-gray-50 rounded border mb-3">{detalle.observaciones}</p>}
                  <ul className="space-y-2">
                    {(detalle.turnos || []).map((t) => (
                      <li key={t.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="font-mono text-xs">{t.turno_codigo}</span>
                          <span className="text-xs">
                            <EtiquetaTurnoConfig texto={t.turno_config_etiqueta} />
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">{t.empleado_nombre}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {subTab === 'combustible' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left">
                      <tr>
                        <th className="p-3">Producto / combustible</th>
                        <th className="p-3 text-right">Galones</th>
                        <th className="p-3 text-right">Soles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detalle.combustible_por_producto || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-500">
                            Sin lecturas de contómetro en los turnos consolidados.
                          </td>
                        </tr>
                      ) : (
                        (detalle.combustible_por_producto || []).map((row) => (
                          <tr key={row.producto_id} className="border-t border-gray-100">
                            <td className="p-3">{row.producto_nombre}</td>
                            <td className="p-3 text-right tabular-nums">{Number(row.total_galones || 0).toFixed(3)}</td>
                            <td className="p-3 text-right tabular-nums">S/ {fmtMonto(row.total_soles)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {(detalle.combustible_por_producto || []).length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                          <td className="p-3">Total</td>
                          <td className="p-3 text-right tabular-nums">{Number(totales.sumCombustibleGalones || 0).toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums">S/ {fmtMonto(totales.sumCombustibleSoles)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  <p className="text-xs text-gray-500 mt-3">Solo lectura — suma de contómetros de todos los turnos de grifero incluidos.</p>
                </div>
              )}

              {subTab === 'productos' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left">
                      <tr>
                        <th className="p-3">Producto</th>
                        <th className="p-3 text-right">Cantidad</th>
                        <th className="p-3 text-right">Soles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detalle.venta_productos_por_producto || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-500">
                            Sin ventas de productos en los turnos consolidados.
                          </td>
                        </tr>
                      ) : (
                        (detalle.venta_productos_por_producto || []).map((row) => (
                          <tr key={row.producto_id} className="border-t border-gray-100">
                            <td className="p-3">{row.producto_nombre}</td>
                            <td className="p-3 text-right tabular-nums">{fmtCantidad(row.total_cantidad)}</td>
                            <td className="p-3 text-right tabular-nums">S/ {fmtMonto(row.total_soles)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {(detalle.venta_productos_por_producto || []).length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                          <td className="p-3">Total</td>
                          <td className="p-3 text-right tabular-nums">{fmtCantidad(totales.sumProductosCantidad)}</td>
                          <td className="p-3 text-right tabular-nums">S/ {fmtMonto(totales.sumProductosSoles)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  <p className="text-xs text-gray-500 mt-3">
                    Solo lectura — suma de líneas de venta por producto (cantidad × precio) en todos los turnos incluidos.
                  </p>
                </div>
              )}

              {subTab === 'gnv' && (
                <div className="space-y-6">
                  {(detalle.gnv_por_turno || []).every(
                    (b) => (b.ventas_gnv || []).length === 0 && (b.financiaciones_gnv || []).length === 0
                  ) ? (
                    <p className="text-sm text-gray-500 text-center py-6">Sin registros GNV en estos turnos.</p>
                  ) : (
                    <>
                      {(detalle.gnv_por_turno || []).map((bloque) => {
                        const nv = (bloque.ventas_gnv || []).length
                        const nf = (bloque.financiaciones_gnv || []).length
                        if (nv === 0 && nf === 0) return null
                        return (
                          <div key={bloque.turno_cabecera_grifero_id}>
                            <h4 className="font-semibold text-gray-900 text-sm mb-3 font-mono">{bloque.turno_codigo}</h4>
                            {nv > 0 && (
                              <div className="mb-4">
                                <p className="text-xs font-medium text-teal-800 mb-1">Venta GNV</p>
                                <ul className="border border-teal-100 rounded-lg p-3 space-y-2 text-sm">
                                  {bloque.ventas_gnv.map((v) => (
                                    <li key={v.id} className="flex justify-between gap-2 border-b border-teal-50 last:border-0 pb-2 last:pb-0">
                                      <span className="tabular-nums font-medium">S/ {fmtMonto(v.venta_total_soles)}</span>
                                      {v.observaciones ? (
                                        <span className="text-gray-600 text-right text-xs shrink-0 max-w-[60%]">{v.observaciones}</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {nf > 0 && (
                              <div>
                                <p className="text-xs font-medium text-cyan-900 mb-1">Financiación GNV</p>
                                <ul className="border border-cyan-100 rounded-lg p-3 space-y-2 text-sm">
                                  {bloque.financiaciones_gnv.map((f) => (
                                    <li key={f.id} className="flex justify-between gap-2 border-b border-cyan-50 last:border-0 pb-2 last:pb-0">
                                      <span className="tabular-nums font-medium">S/ {fmtMonto(f.monto_soles)}</span>
                                      {f.observaciones ? (
                                        <span className="text-gray-600 text-right text-xs shrink-0 max-w-[60%]">{f.observaciones}</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div className="border-t-2 border-gray-200 bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                        <p className="font-semibold text-gray-900">Totales consolidación (GNV)</p>
                        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 tabular-nums">
                          <span className="text-gray-600">Venta GNV</span>
                          <span className="font-medium text-teal-800">S/ {fmtMonto(totales.sumVentaGnv)}</span>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 tabular-nums">
                          <span className="text-gray-600">Financiación GNV</span>
                          <span className="font-medium text-cyan-900">S/ {fmtMonto(totales.sumFinanciacionGnv)}</span>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 pt-2 border-t border-gray-200 tabular-nums font-semibold text-gray-900">
                          <span>Total (suma al efectivo)</span>
                          <span>S/ {fmtMonto(totales.sumGnvEfectivo)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-gray-500">Solo lectura — mismos datos que el cuadre de cada turno de grifero.</p>
                </div>
              )}

              {subTab === 'ventas_pos' && (
                <div className="space-y-6">
                  {(detalle.pos_por_turno || []).every((b) => (b.ventas_pos || []).length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-6">Sin ventas POS en estos turnos.</p>
                  ) : (
                    (detalle.pos_por_turno || []).map((bloque) =>
                      (bloque.ventas_pos || []).length === 0 ? null : (
                        <div key={bloque.turno_cabecera_grifero_id}>
                          <h4 className="font-semibold text-gray-900 text-sm mb-2 font-mono">{bloque.turno_codigo}</h4>
                          <ul className="space-y-2 border border-gray-100 rounded-lg p-3">
                            {bloque.ventas_pos.map((v) => (
                              <li key={v.id} className="text-sm flex justify-between gap-2 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                <span>
                                  S/ {fmtMonto(v.monto)} · {v.tipo_tarjeta} · Op. {v.numero_operacion}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )
                  )}
                </div>
              )}

              {subTab === 'guias' && (
                <div className="space-y-6">
                  {(detalle.guias_por_turno || []).map((bloque) => {
                    const nc = (bloque.guias_credito || []).length
                    const nr = (bloque.guias_remision || []).length
                    if (nc === 0 && nr === 0) return null
                    return (
                      <div key={bloque.turno_cabecera_grifero_id}>
                        <h4 className="font-semibold text-gray-900 text-sm mb-2 font-mono">{bloque.turno_codigo}</h4>
                        {nc > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-amber-800 mb-1">Guía crédito</p>
                            <ul className="border border-amber-100 rounded-lg p-2 space-y-1 text-sm">
                              {bloque.guias_credito.map((g) => (
                                <li key={g.id}>
                                  S/ {fmtMonto(g.monto)}
                                  {g.numero_documento ? ` · Doc. ${g.numero_documento}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {nr > 0 && (
                          <div>
                            <p className="text-xs font-medium text-yellow-900 mb-1">Guía remisión</p>
                            <ul className="border border-yellow-100 rounded-lg p-2 space-y-1 text-sm">
                              {bloque.guias_remision.map((g) => (
                                <li key={g.id}>
                                  S/ {fmtMonto(g.monto)}
                                  {g.numero_documento ? ` · Doc. ${g.numero_documento}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {(detalle.guias_por_turno || []).every(
                    (b) => (b.guias_credito || []).length === 0 && (b.guias_remision || []).length === 0
                  ) && <p className="text-sm text-gray-500 text-center py-6">Sin guías en estos turnos.</p>}
                </div>
              )}

              {subTab === 'venta_servicentro' && renderTablaVentasServicentro()}
              {subTab === 'cobranzas' && renderTablaCobranzas()}
            </div>
          </div>
        </div>
      </div>

      {edicion?.tipo === 'venta_servicentro' && (
        <ModalVentaServicentro
          fila={edicion.fila}
          onClose={() => setEdicion(null)}
          onGuardar={guardarVenta}
        />
      )}
      {edicion?.tipo === 'cobranzas' && (
        <ModalCobranza fila={edicion.fila} onClose={() => setEdicion(null)} onGuardar={guardarCobranza} />
      )}

      {eliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="card p-6 max-w-sm w-full">
            <p className="text-sm text-gray-800 mb-4">¿Eliminar este registro?</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setEliminar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={confirmEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
