import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Fuel,
  CreditCard,
  FileText,
  Store,
  Wallet,
  LayoutList,
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
} from '../utils/api'

const TAB_CONFIG = [
  { id: 'resumen', label: 'Turnos incluidos', icon: LayoutList, readOnly: true },
  { id: 'combustible', label: 'Combustible', icon: Fuel, readOnly: true },
  { id: 'ventas_pos', label: 'Ventas POS', icon: CreditCard, readOnly: true },
  { id: 'guias', label: 'Guías crédito / remisión', icon: FileText, readOnly: true },
  { id: 'venta_servicentro', label: 'Venta servicentro', icon: Store, readOnly: false },
  { id: 'cobranzas', label: 'Cobranzas', icon: Wallet, readOnly: false },
]

function fmt2(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toFixed(2) : '0.00'
}

function ModalVentaServicentro({ fila, onClose, onGuardar }) {
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (fila) {
      setMonto(fila.monto != null ? String(fila.monto) : '')
      setConcepto(fila.concepto ?? '')
      setObservaciones(fila.observaciones ?? '')
    } else {
      setMonto('')
      setConcepto('')
      setObservaciones('')
    }
  }, [fila])

  const submit = (e) => {
    e.preventDefault()
    onGuardar({
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
  const [montoFactura, setMontoFactura] = useState('')
  const [montoRetencion, setMontoRetencion] = useState('0')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (fila) {
      setMontoFactura(fila.monto_factura != null ? String(fila.monto_factura) : '')
      setMontoRetencion(fila.monto_retencion != null ? String(fila.monto_retencion) : '0')
      setConcepto(fila.concepto ?? '')
      setObservaciones(fila.observaciones ?? '')
    } else {
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
      monto_factura: mf,
      monto_retencion: mr,
      concepto: concepto.trim() || null,
      observaciones: observaciones.trim() || null,
    })
  }

  const retMayor = (parseFloat(montoRetencion) || 0) > (parseFloat(montoFactura) || 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="card p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">{fila ? 'Editar cobranza' : 'Nueva cobranza'}</h3>
        <form onSubmit={submit} className="space-y-3">
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
  const [subTab, setSubTab] = useState('resumen')
  const [cerrando, setCerrando] = useState(false)
  const [edicion, setEdicion] = useState(null)
  const [eliminar, setEliminar] = useState(null)

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const d = await obtenerConsolidacionVistaOperativa(consolidacionId)
      setDetalle(d)
    } catch (e) {
      onMensaje(e.response?.data?.detail || 'Error al cargar la consolidación', 'error')
      setDetalle(null)
    } finally {
      setLoading(false)
    }
  }, [consolidacionId, onMensaje])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pendiente = detalle?.estado === 'pendiente'

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
    return { sumVs, sumFactura, sumRet, sumNeto }
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
      <div>
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
              Agregar
            </button>
          )}
        </div>
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Sin registros.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-2">
                <div>
                  <p className="font-semibold">S/ {fmt2(r.monto)}</p>
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
    )
  }

  const renderTablaCobranzas = () => {
    const rows = detalle?.cobranzas || []
    return (
      <div>
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
              Agregar
            </button>
          )}
        </div>
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Sin registros.</p>
          ) : (
            rows.map((r) => {
              const neto =
                r.monto_cobrado != null ? Number(r.monto_cobrado) : montoCobradoLocal(r.monto_factura, r.monto_retencion)
              return (
                <div key={r.id} className="border border-gray-100 rounded-lg p-3 flex justify-between gap-2">
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-600">Factura:</span> <span className="font-semibold">S/ {fmt2(r.monto_factura)}</span>
                      <span className="text-gray-500 mx-2">·</span>
                      <span className="text-gray-600">Retención:</span> <span className="font-medium">S/ {fmt2(r.monto_retencion)}</span>
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
                <div className="bg-white rounded-lg p-3 border border-primary-100">
                  <p className="text-xs text-gray-600">Σ Efectivo esperado</p>
                  <p className="text-lg font-bold text-primary-700">S/ {fmt2(detalle.suma_efectivo_esperado)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-gray-600">Σ Efectivo entregado</p>
                  <p className="text-lg font-bold text-green-700">S/ {fmt2(detalle.suma_efectivo_entregado)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Σ Diferencia</p>
                  <p className="text-lg font-bold text-gray-900">S/ {fmt2(detalle.suma_diferencia)}</p>
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
                        <div className="flex gap-4 mt-1 text-xs tabular-nums">
                          <span>Esp. S/ {fmt2(t.efectivo_esperado)}</span>
                          <span>Ent. S/ {fmt2(t.efectivo_entregado)}</span>
                        </div>
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
                  </table>
                  <p className="text-xs text-gray-500 mt-3">Solo lectura — suma de contómetros de todos los turnos de grifero incluidos.</p>
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
