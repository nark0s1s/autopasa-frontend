import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Fuel,
  Flame,
  Package,
  CreditCard,
  FileText,
  Store,
  Wallet,
  LayoutList,
  Calculator,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
} from '../utils/api'

const TAB_CONFIG = [
  { id: 'cuadre_general', label: 'Cuadre general', icon: Calculator, readOnly: true },
  { id: 'resumen', label: 'Turnos incluidos', icon: LayoutList, readOnly: true },
  { id: 'combustible', label: 'Combustible', icon: Fuel, readOnly: true },
  { id: 'productos', label: 'Venta productos', icon: Package, readOnly: true },
  { id: 'gnv', label: 'GNV', icon: Flame, readOnly: true },
  { id: 'ventas_pos', label: 'Ventas POS', icon: CreditCard, readOnly: true },
  { id: 'guias', label: 'Guías crédito / remisión', icon: FileText, readOnly: true },
  { id: 'venta_servicentro', label: 'Venta servicentro', icon: Store, readOnly: false },
  { id: 'cobranzas', label: 'Cobranzas', icon: Wallet, readOnly: false },
]

function fmt2(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toFixed(2) : '0.00'
}

function toYMD(d) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

function ModalVentaServicentro({ fila, onClose, onGuardar }) {
  const [fechaVenta, setFechaVenta] = useState(() => toYMD(new Date()))
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (fila) {
      setFechaVenta((fila.fecha_venta || '').slice(0, 10) || toYMD(new Date()))
      setMonto(fila.monto != null ? String(fila.monto) : '')
      setConcepto(fila.concepto ?? '')
      setObservaciones(fila.observaciones ?? '')
    } else {
      setFechaVenta(toYMD(new Date()))
      setMonto('')
      setConcepto('')
      setObservaciones('')
    }
  }, [fila])

  const submit = (e) => {
    e.preventDefault()
    onGuardar({
      fecha_venta: fechaVenta,
      monto: parseFloat(monto),
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
            <button type="submit" className="btn btn-primary flex-1">
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

function ModalCobranza({ fila, onClose, onGuardar }) {
  const [fechaCobranza, setFechaCobranza] = useState(() => toYMD(new Date()))
  const [numeroFactura, setNumeroFactura] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clientes, setClientes] = useState([])
  const [montoFactura, setMontoFactura] = useState('')
  const [montoRetencion, setMontoRetencion] = useState('0')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    getClientesAdmin(true)
      .then((d) => setClientes(Array.isArray(d) ? d : []))
      .catch(() => setClientes([]))
  }, [])

  useEffect(() => {
    if (fila) {
      setFechaCobranza((fila.fecha_cobranza || '').slice(0, 10) || toYMD(new Date()))
      setNumeroFactura(fila.numero_factura ?? '')
      setClienteId(fila.cliente_id != null ? String(fila.cliente_id) : '')
      setMontoFactura(fila.monto_factura != null ? String(fila.monto_factura) : '')
      setMontoRetencion(fila.monto_retencion != null ? String(fila.monto_retencion) : '0')
      setConcepto(fila.concepto ?? '')
      setObservaciones(fila.observaciones ?? '')
    } else {
      setFechaCobranza(toYMD(new Date()))
      setNumeroFactura('')
      setClienteId('')
      setMontoFactura('')
      setMontoRetencion('0')
      setConcepto('')
      setObservaciones('')
    }
  }, [fila])

  const neto = montoCobradoLocal(montoFactura, montoRetencion)

  const submit = (e) => {
    e.preventDefault()
    const mf = parseFloat(montoFactura)
    const mr = parseFloat(montoRetencion) || 0
    if (mr > mf) {
      return
    }
    onGuardar({
      fecha_cobranza: fechaCobranza,
      numero_factura: numeroFactura.trim() || null,
      cliente_id: clienteId ? parseInt(clienteId, 10) : null,
      monto_factura: mf,
      monto_retencion: mr,
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
            <p className="text-lg font-bold text-teal-800">S/ {fmt2(neto)}</p>
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
            <button type="submit" className="btn btn-primary flex-1" disabled={retMayor}>
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
    const sumFactura = cob.reduce((s, x) => s + Number(x.monto_factura || 0), 0)
    const sumRet = cob.reduce((s, x) => s + Number(x.monto_retencion || 0), 0)
    const sumNeto = cob.reduce((s, x) => {
      const mc = x.monto_cobrado != null ? Number(x.monto_cobrado) : montoCobradoLocal(x.monto_factura, x.monto_retencion)
      return s + mc
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
    const subtotalCombustibleYGnv = sumCombustibleSoles + sumGnvEfectivo
    const cuadreFinal =
      subtotalCombustibleYGnv +
      sumProductosSoles +
      sumVs +
      sumNeto -
      sumDescuentosTurnos -
      sumVentasCreditoTotal
    return {
      sumVs,
      sumFactura,
      sumRet,
      sumNeto,
      sumCombustibleSoles,
      sumCombustibleGalones,
      sumVentaGnv,
      sumFinanciacionGnv,
      sumGnvEfectivo,
      sumProductosSoles,
      sumProductosCantidad,
      sumGuiasCredito,
      sumGuiasRemision,
      sumVentasCreditoTotal,
      sumDescuentosTurnos,
      subtotalCombustibleYGnv,
      cuadreFinal,
    }
  }, [detalle])

  const handleCerrarConsolidacion = async () => {
    if (!pendiente) return
    if (!window.confirm('¿Cerrar esta consolidación? No podrá agregar ni editar ventas servicentro ni cobranzas después.')) return
    try {
      setCerrando(true)
      await cerrarConsolidacionLiquidacion(consolidacionId)
      onMensaje('Consolidación cerrada correctamente')
      onCerrada?.()
      onClose()
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'No se pudo cerrar', 'error')
    } finally {
      setCerrando(false)
    }
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
                            <p className="font-semibold text-teal-900">S/ {fmt2(r.monto)}</p>
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
              <strong className="text-gray-900">S/ {fmt2(totales.sumVs)}</strong>
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
                    <p className="font-semibold">S/ {fmt2(r.monto)}</p>
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
                        <p className="font-semibold text-cyan-900">Neto S/ {fmt2(neto)}</p>
                        <p className="text-xs text-gray-600">
                          Fact. S/ {fmt2(r.monto_factura)} · Ret. S/ {fmt2(r.monto_retencion)}
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
                <strong className="text-gray-900">S/ {fmt2(totales.sumNeto)}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Facturas S/ {fmt2(totales.sumFactura)} · Retenciones S/ {fmt2(totales.sumRet)}
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
                            {r.turno_config_etiqueta ? ` (${r.turno_config_etiqueta})` : ''}
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
                        <span className="font-semibold">S/ {fmt2(r.monto_factura)}</span>
                        <span className="text-gray-500 mx-2">·</span>
                        <span className="text-gray-600">Retención:</span>{' '}
                        <span className="font-medium">S/ {fmt2(r.monto_retencion)}</span>
                      </p>
                      <p className="text-teal-800 font-semibold">Monto cobrado: S/ {fmt2(neto)}</p>
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
                    onClick={handleCerrarConsolidacion}
                    disabled={cerrando}
                  >
                    {cerrando ? 'Cerrando…' : 'Cerrar consolidación'}
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
                  <p className="text-lg font-bold text-amber-900">S/ {fmt2(totales.sumCombustibleSoles)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Σ galones {Number(totales.sumCombustibleGalones || 0).toFixed(3)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="text-xs text-gray-600">GNV (venta + financ.)</p>
                  <p className="text-lg font-bold text-orange-900">S/ {fmt2(totales.sumGnvEfectivo)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Venta S/ {fmt2(totales.sumVentaGnv)} · Fin. S/ {fmt2(totales.sumFinanciacionGnv)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-violet-100">
                  <p className="text-xs text-gray-600">Venta productos</p>
                  <p className="text-lg font-bold text-violet-900">S/ {fmt2(totales.sumProductosSoles)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Σ cantidad {fmt2(totales.sumProductosCantidad)} u.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-teal-100">
                  <p className="text-xs text-gray-600">Venta servicentro</p>
                  <p className="text-lg font-bold text-teal-800">S/ {fmt2(totales.sumVs)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-cyan-100">
                  <p className="text-xs text-gray-600">Cobranzas (neto)</p>
                  <p className="text-lg font-bold text-cyan-900">S/ {fmt2(totales.sumNeto)}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                    Fact. S/ {fmt2(totales.sumFactura)} · Ret. S/ {fmt2(totales.sumRet)}
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
                          totales.sumGnvEfectivo === 0 ? (
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
                                  <td className="p-3 text-right tabular-nums">S/ {fmt2(row.total_soles)}</td>
                                </tr>
                              ))}
                              {totales.sumGnvEfectivo > 0 && (
                                <tr className="border-t border-gray-100 bg-orange-50/30">
                                  <td className="p-3">GNV</td>
                                  <td className="p-3 text-right text-gray-400">—</td>
                                  <td className="p-3 text-right tabular-nums">S/ {fmt2(totales.sumGnvEfectivo)}</td>
                                </tr>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {((detalle.combustible_por_producto || []).length > 0 || totales.sumGnvEfectivo > 0) && (
                      <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50/80 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                        <div>
                          <span className="font-semibold text-emerald-900 text-base">Venta de Combustibles</span>
                          <p className="text-xs text-emerald-800/90 mt-0.5">
                            Incluye GNV · Σ galones combustible{' '}
                            {(detalle.combustible_por_producto || []).length > 0
                              ? Number(totales.sumCombustibleGalones || 0).toFixed(3)
                              : '—'}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-emerald-800 tabular-nums">+ S/ {fmt2(totales.subtotalCombustibleYGnv)}</span>
                      </div>
                    )}
                  </section>

                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                    <span className="font-semibold text-sky-950 text-base">Venta de productos</span>
                    <span className="text-xl font-bold text-sky-800 tabular-nums">+ S/ {fmt2(totales.sumProductosSoles)}</span>
                  </div>

                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                    <span className="font-semibold text-sky-950 text-base">Venta servicentro</span>
                    <span className="text-xl font-bold text-sky-800 tabular-nums">+ S/ {fmt2(totales.sumVs)}</span>
                  </div>

                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 flex flex-wrap justify-between gap-2 items-center shadow-sm">
                    <span className="font-semibold text-sky-950 text-base">Total cobranzas (neto)</span>
                    <span className="text-xl font-bold text-sky-800 tabular-nums">+ S/ {fmt2(totales.sumNeto)}</span>
                  </div>

                  <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 flex flex-wrap justify-between gap-2 items-center">
                    <span className="font-semibold text-red-900 text-base">Descuentos</span>
                    <span className="text-xl font-bold text-red-700 tabular-nums">− S/ {fmt2(totales.sumDescuentosTurnos)}</span>
                  </div>

                  <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 flex flex-wrap justify-between gap-2 items-center">
                    <span className="font-semibold text-red-900 text-base">Ventas al crédito</span>
                    <span className="text-xl font-bold text-red-700 tabular-nums">− S/ {fmt2(totales.sumVentasCreditoTotal)}</span>
                  </div>

                  <div className="rounded-xl border-2 border-emerald-800 bg-emerald-700 p-5 sm:p-6 space-y-2 shadow-md">
                    <div className="flex flex-wrap justify-between gap-3 items-center">
                      <span className="text-base sm:text-lg font-bold text-white tracking-tight">Cuadre final</span>
                      <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums drop-shadow-sm">
                        S/ {fmt2(totales.cuadreFinal)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/95 leading-relaxed border-t border-emerald-600/80 pt-3">
                      Combustible + GNV + productos + servicentro + cobranzas (neto) − descuentos − ventas al crédito.
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
                          <span className="text-xs text-gray-500">{t.turno_config_etiqueta}</span>
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
                            <td className="p-3 text-right tabular-nums">S/ {fmt2(row.total_soles)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {(detalle.combustible_por_producto || []).length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                          <td className="p-3">Total</td>
                          <td className="p-3 text-right tabular-nums">{Number(totales.sumCombustibleGalones || 0).toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums">S/ {fmt2(totales.sumCombustibleSoles)}</td>
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
                            <td className="p-3 text-right tabular-nums">{fmt2(row.total_cantidad)}</td>
                            <td className="p-3 text-right tabular-nums">S/ {fmt2(row.total_soles)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {(detalle.venta_productos_por_producto || []).length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-900">
                          <td className="p-3">Total</td>
                          <td className="p-3 text-right tabular-nums">{fmt2(totales.sumProductosCantidad)}</td>
                          <td className="p-3 text-right tabular-nums">S/ {fmt2(totales.sumProductosSoles)}</td>
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
                                      <span className="tabular-nums font-medium">S/ {fmt2(v.venta_total_soles)}</span>
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
                                      <span className="tabular-nums font-medium">S/ {fmt2(f.monto_soles)}</span>
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
                          <span className="font-medium text-teal-800">S/ {fmt2(totales.sumVentaGnv)}</span>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 tabular-nums">
                          <span className="text-gray-600">Financiación GNV</span>
                          <span className="font-medium text-cyan-900">S/ {fmt2(totales.sumFinanciacionGnv)}</span>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 pt-2 border-t border-gray-200 tabular-nums font-semibold text-gray-900">
                          <span>Total (suma al efectivo)</span>
                          <span>S/ {fmt2(totales.sumGnvEfectivo)}</span>
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
                                  S/ {fmt2(v.monto)} · {v.tipo_tarjeta} · Op. {v.numero_operacion}
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
                                  S/ {fmt2(g.monto)}
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
                                  S/ {fmt2(g.monto)}
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
