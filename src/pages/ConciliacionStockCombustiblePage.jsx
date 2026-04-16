import { useCallback, useEffect, useState } from 'react'
import { Fuel, ArrowLeft, RefreshCw, X, AlertTriangle, CheckCircle, FileDown } from 'lucide-react'
import {
  listarConsolidacionesPendientesConciliacionStock,
  crearOAbrirConciliacionStockPorConsolidacion,
  obtenerConciliacionStock,
  actualizarLineasConciliacionStock,
  cerrarConciliacionStock,
  listarHistorialConciliacionesStockCerradas,
  listarComprasCombustibleDisponiblesConciliacion,
  patchEstadoLogisticaCompraCombustible,
  vincularComprasConciliacionStock,
  desvincularComprasConciliacionStock,
  downloadConciliacionStockCombustiblePdf,
} from '../utils/api'

function fmtErr(e) {
  const d = e.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join('; ')
  if (d && typeof d === 'object') return JSON.stringify(d)
  return e.message || 'Error'
}

function fmtNum(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function fmtDateOnly(s) {
  if (!s) return '—'
  return String(s).slice(0, 10)
}

function semaforoClass(sem) {
  if (sem === 'verde') return 'bg-emerald-100 text-emerald-800'
  if (sem === 'amarillo') return 'bg-amber-100 text-amber-900'
  if (sem === 'rojo') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-600'
}

function parseNumInput(s) {
  const t = String(s ?? '').trim()
  if (t === '') return null
  const n = Number(t.replace(',', '.'))
  if (Number.isNaN(n)) return undefined
  return n
}

function labelEstadoCombustible(codigo) {
  const c = String(codigo || '').toLowerCase()
  if (c === 'comprado') return 'Comprado'
  if (c === 'en_tanques') return 'En tanques'
  if (c === 'incluida_conciliacion') return 'Incluida en conciliación'
  return codigo || '—'
}

/** Con medición manual (gal): diff = med − teórico; semáforo = %|diff|/|teórico| vs umbrales (misma lógica que API). */
function calcPreviewDiferenciaMedicion(medicionStr, saldoTeorico, umbralVerdePct, umbralAmarilloPct) {
  const m = parseNumInput(medicionStr)
  if (m === undefined) return { diff: undefined, sem: null }
  if (m === null) return { diff: null, sem: null }
  const teor = Number(saldoTeorico)
  if (Number.isNaN(teor)) return { diff: m, sem: null }
  const diff = m - teor
  if (teor === 0) return { diff, sem: null }
  const pct = (Math.abs(diff) / Math.abs(teor)) * 100
  const uv = Number(umbralVerdePct ?? 0.5)
  const ua = Number(umbralAmarilloPct ?? 1)
  let sem = 'rojo'
  if (pct <= uv) sem = 'verde'
  else if (pct <= ua) sem = 'amarillo'
  return { diff, sem }
}

/** Mismo cuerpo que «Guardar borrador»: persistir mediciones y cabecera antes de cerrar. */
function buildPatchLineasBody(detalle, lineEdits, obsCab) {
  const lineas = (detalle.lineas || []).map((ln) => {
    const ed = lineEdits[ln.id] || {}
    const ml = parseNumInput(ed.medicion_litros)
    const item = { id: ln.id }
    if (ml !== null && ml !== undefined) item.medicion_litros = ml
    return item
  })
  return {
    lineas,
    observaciones: obsCab.trim() || null,
    fecha_corte_medicion: null,
  }
}

export default function ConciliacionStockCombustiblePage() {
  const [tab, setTab] = useState('pendientes')
  const [pendientes, setPendientes] = useState([])
  const [historial, setHistorial] = useState([])
  const [loadingLista, setLoadingLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')

  const [detalle, setDetalle] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [obsCab, setObsCab] = useState('')
  const [lineEdits, setLineEdits] = useState({})

  const [modalConfirmarCerrar, setModalConfirmarCerrar] = useState(false)
  const [obsCierre, setObsCierre] = useState('')
  const [modalExitoCerrar, setModalExitoCerrar] = useState(null)

  const [modalCompras, setModalCompras] = useState(false)
  const [disponibles, setDisponibles] = useState([])
  const [loadingComprasModal, setLoadingComprasModal] = useState(false)
  const [errorComprasModal, setErrorComprasModal] = useState('')
  const [selDisponibles, setSelDisponibles] = useState({})
  const [estadoDraft, setEstadoDraft] = useState({})
  const [savingCompraEstado, setSavingCompraEstado] = useState(null)
  const [savingVinculo, setSavingVinculo] = useState(false)

  const syncEditsFromDetalle = useCallback((d) => {
    if (!d?.lineas) {
      setLineEdits({})
      return
    }
    const next = {}
    for (const ln of d.lineas) {
      next[ln.id] = {
        medicion_litros: ln.medicion_litros != null ? String(ln.medicion_litros) : '',
      }
    }
    setLineEdits(next)
    setObsCab(d.observaciones != null ? String(d.observaciones) : '')
  }, [])

  const cargarPendientes = useCallback(async () => {
    setErrorLista('')
    setLoadingLista(true)
    try {
      const rows = await listarConsolidacionesPendientesConciliacionStock({ limit: 200 })
      setPendientes(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setErrorLista(fmtErr(e))
      setPendientes([])
    } finally {
      setLoadingLista(false)
    }
  }, [])

  const cargarHistorial = useCallback(async () => {
    setErrorLista('')
    setLoadingLista(true)
    try {
      const rows = await listarHistorialConciliacionesStockCerradas({ limit: 100 })
      setHistorial(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setErrorLista(fmtErr(e))
      setHistorial([])
    } finally {
      setLoadingLista(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'pendientes') cargarPendientes()
    else cargarHistorial()
  }, [tab, cargarPendientes, cargarHistorial])

  const abrirDetalle = async (row) => {
    setErrorDetalle('')
    setLoadingDetalle(true)
    setDetalle(null)
    try {
      let d
      if (row.conciliacion_stock_id) {
        d = await obtenerConciliacionStock(row.conciliacion_stock_id)
      } else {
        d = await crearOAbrirConciliacionStockPorConsolidacion(row.consolidacion_id)
      }
      setDetalle(d)
      syncEditsFromDetalle(d)
    } catch (e) {
      setErrorDetalle(fmtErr(e))
    } finally {
      setLoadingDetalle(false)
    }
  }

  const abrirHistorialItem = async (item) => {
    setErrorDetalle('')
    setLoadingDetalle(true)
    setDetalle(null)
    try {
      const d = await obtenerConciliacionStock(item.id)
      setDetalle(d)
      syncEditsFromDetalle(d)
    } catch (e) {
      setErrorDetalle(fmtErr(e))
    } finally {
      setLoadingDetalle(false)
    }
  }

  const volverLista = () => {
    setDetalle(null)
    setErrorDetalle('')
    syncEditsFromDetalle(null)
    if (tab === 'pendientes') cargarPendientes()
    else cargarHistorial()
  }

  const patchLineField = (lineaId, field, value) => {
    setLineEdits((prev) => ({
      ...prev,
      [lineaId]: { ...prev[lineaId], [field]: value },
    }))
  }

  const guardarBorrador = async () => {
    if (!detalle?.lineas) return
    setSaving(true)
    setErrorDetalle('')
    try {
      const body = buildPatchLineasBody(detalle, lineEdits, obsCab)
      const d = await actualizarLineasConciliacionStock(detalle.id, body)
      setDetalle(d)
      syncEditsFromDetalle(d)
    } catch (e) {
      setErrorDetalle(fmtErr(e))
    } finally {
      setSaving(false)
    }
  }

  const abrirModalCompras = async () => {
    if (!detalle?.id) return
    setModalCompras(true)
    setErrorComprasModal('')
    setSelDisponibles({})
    setEstadoDraft({})
    setLoadingComprasModal(true)
    try {
      const rows = await listarComprasCombustibleDisponiblesConciliacion({ limit: 300 })
      const list = Array.isArray(rows) ? rows : []
      setDisponibles(list)
      const ed = {}
      for (const r of list) {
        const st = r.estado_combustible_logistica || 'en_tanques'
        ed[r.id] = st
      }
      setEstadoDraft(ed)
    } catch (e) {
      setErrorComprasModal(fmtErr(e))
      setDisponibles([])
    } finally {
      setLoadingComprasModal(false)
    }
  }

  const recargarDisponiblesModal = async () => {
    setLoadingComprasModal(true)
    setErrorComprasModal('')
    try {
      const rows = await listarComprasCombustibleDisponiblesConciliacion({ limit: 300 })
      const list = Array.isArray(rows) ? rows : []
      setDisponibles(list)
      setEstadoDraft((prev) => {
        const next = { ...prev }
        for (const r of list) {
          if (next[r.id] === undefined) next[r.id] = r.estado_combustible_logistica || 'en_tanques'
        }
        return next
      })
    } catch (e) {
      setErrorComprasModal(fmtErr(e))
    } finally {
      setLoadingComprasModal(false)
    }
  }

  const guardarEstadoCompraDisponible = async (compraId) => {
    const st = estadoDraft[compraId] || 'en_tanques'
    setSavingCompraEstado(compraId)
    setErrorComprasModal('')
    try {
      await patchEstadoLogisticaCompraCombustible(compraId, { estado_combustible_logistica: st })
      await recargarDisponiblesModal()
    } catch (e) {
      setErrorComprasModal(fmtErr(e))
    } finally {
      setSavingCompraEstado(null)
    }
  }

  const vincularSeleccionadas = async () => {
    if (!detalle?.id) return
    const ids = Object.entries(selDisponibles)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
    if (ids.length === 0) {
      setErrorComprasModal('Seleccione al menos una factura para incluir.')
      return
    }
    setSavingVinculo(true)
    setErrorComprasModal('')
    try {
      const d = await vincularComprasConciliacionStock(detalle.id, { compra_factura_ids: ids })
      setDetalle(d)
      syncEditsFromDetalle(d)
      setSelDisponibles({})
      await recargarDisponiblesModal()
    } catch (e) {
      setErrorComprasModal(fmtErr(e))
    } finally {
      setSavingVinculo(false)
    }
  }

  const quitarCompraVinculada = async (compraId) => {
    if (!detalle?.id) return
    setSavingVinculo(true)
    setErrorComprasModal('')
    try {
      const d = await desvincularComprasConciliacionStock(detalle.id, { compra_factura_ids: [compraId] })
      setDetalle(d)
      syncEditsFromDetalle(d)
      await recargarDisponiblesModal()
    } catch (e) {
      setErrorComprasModal(fmtErr(e))
    } finally {
      setSavingVinculo(false)
    }
  }

  const abrirModalCerrarConciliacion = () => {
    setErrorDetalle('')
    setObsCierre('')
    setModalCompras(false)
    setModalConfirmarCerrar(true)
  }

  const descargarPdfConciliacion = async () => {
    if (!detalle?.id) return
    setDownloadingPdf(true)
    setErrorDetalle('')
    try {
      await downloadConciliacionStockCombustiblePdf(detalle.id)
    } catch (e) {
      setErrorDetalle(fmtErr(e))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const ejecutarCierreConciliacion = async () => {
    if (!detalle?.id) return
    setSaving(true)
    setErrorDetalle('')
    try {
      const bodyPatch = buildPatchLineasBody(detalle, lineEdits, obsCab)
      await actualizarLineasConciliacionStock(detalle.id, bodyPatch)
      const d = await cerrarConciliacionStock(detalle.id, {
        observaciones_cierre: obsCierre.trim() || null,
      })
      setDetalle(d)
      syncEditsFromDetalle(d)
      setModalConfirmarCerrar(false)
      setModalExitoCerrar({
        conciliacionId: d.id,
        consolidacionId: d.consolidacion_liquidacion_id,
      })
    } catch (e) {
      setErrorDetalle(fmtErr(e))
    } finally {
      setSaving(false)
    }
  }

  const esBorrador = detalle && String(detalle.estado).toLowerCase() === 'borrador'
  const umbralVerde = detalle?.umbral_verde_pct ?? 0.5
  const umbralAmarillo = detalle?.umbral_amarillo_pct ?? 1

  if (detalle) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button
          type="button"
          onClick={volverLista}
          className="inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
              <Fuel className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Conciliación stock combustible</h1>
              <p className="text-sm text-gray-600">
                Consolidación #{detalle.consolidacion_liquidacion_id} · Conciliación #{detalle.id} · Estado:{' '}
                <span className="font-medium">{detalle.estado}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
          {!esBorrador && (
            <button
              type="button"
              disabled={downloadingPdf}
              onClick={descargarPdfConciliacion}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {downloadingPdf ? 'Generando reporte…' : 'Generar Reporte'}
            </button>
          )}
          {esBorrador && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={guardarBorrador}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Guardar borrador
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={abrirModalCompras}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Compras combustible
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={abrirModalCerrarConciliacion}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Cerrar conciliación
              </button>
            </div>
          )}
          </div>
        </div>

        {loadingDetalle && <p className="text-sm text-gray-500">Cargando…</p>}
        {errorDetalle && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorDetalle}</div>
        )}

        {!esBorrador && detalle.cerrada_en && (
          <p className="text-sm text-gray-600 mb-4">Cerrada el {fmtDate(detalle.cerrada_en)}</p>
        )}

        {esBorrador && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Fecha de corte medición (consolidación)
              </label>
              <p className="text-sm font-medium text-gray-900 tabular-nums py-2 px-3 rounded-lg bg-gray-50 border border-gray-200">
                {fmtDateOnly(detalle.fecha_turno_consolidacion || detalle.fecha_corte_medicion)}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Corresponde a la <strong className="text-gray-600">fecha de turno consolidada</strong> guardada al cerrar la
                liquidación (la mayor <code className="text-gray-700">fecha_turno</code> de los turnos incluidos). Con ella se
                calcula el <strong className="text-gray-600">saldo inicial</strong> en galones: 1) si en el producto la{' '}
                <strong className="text-gray-600">fecha de stock de corte</strong> coincide con esta fecha (Lima), se usa{' '}
                <strong className="text-gray-600">stock_corte_saldo</strong> del producto si el corte físico (Lima) es
                el mismo día que esta fecha o el día siguiente; 2) si no, la última conciliación de stock <em>cerrada</em>{' '}
                con fecha de corte <strong className="text-gray-600">anterior</strong> (mismo producto; medición o
                teórico); 3) si no aplica, saldo kardex al inicio del día de corte (Lima).
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones (cabecera)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                value={obsCab}
                onChange={(e) => setObsCab(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium text-right">Saldo inicial (gal)</th>
                <th className="px-3 py-2 font-medium text-right">Ventas consolidado (gal)</th>
                <th className="px-3 py-2 font-medium text-right">Ingresos declarados (gal)</th>
                <th className="px-3 py-2 font-medium text-right">Teórico (gal)</th>
                <th className="px-3 py-2 font-medium text-right">Medición manual (gal)</th>
                <th className="px-3 py-2 font-medium text-right">Diferencia (gal)</th>
                <th className="px-3 py-2 font-medium">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {(detalle.lineas || []).map((ln) => {
                const ed = lineEdits[ln.id] || {}
                const preview = esBorrador
                  ? calcPreviewDiferenciaMedicion(ed.medicion_litros, ln.saldo_teorico_litros, umbralVerde, umbralAmarillo)
                  : null
                const diffMostrar = esBorrador
                  ? preview && preview.diff !== null && preview.diff !== undefined
                    ? preview.diff
                    : null
                  : ln.diferencia_litros
                const semTexto = esBorrador
                  ? preview && preview.diff !== null && preview.diff !== undefined
                    ? preview.sem ?? '—'
                    : '—'
                  : ln.semaforo || '—'
                const semClass = esBorrador
                  ? preview && preview.diff !== null && preview.diff !== undefined
                    ? preview.sem
                    : null
                  : ln.semaforo
                return (
                  <tr key={ln.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">{ln.producto_nombre || `Producto ${ln.producto_id}`}</td>
                    <td className="px-3 py-2 text-right text-gray-800 tabular-nums">{fmtNum(ln.saldo_inicial_litros)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtNum(ln.galones_ventas_consolidado)}</td>
                    <td className="px-3 py-2 text-right text-gray-800 tabular-nums">{fmtNum(ln.galones_ingresos_declarados)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtNum(ln.saldo_teorico_litros)}</td>
                    <td className="px-3 py-2 text-right">
                      {esBorrador ? (
                        <input
                          className="w-32 max-w-full border border-primary-300 rounded-lg px-2 py-1.5 text-right text-gray-900 focus:ring-2 focus:ring-primary-400 focus:border-primary-500"
                          value={ed.medicion_litros ?? ''}
                          onChange={(e) => patchLineField(ln.id, 'medicion_litros', e.target.value)}
                          placeholder="Galones"
                          inputMode="decimal"
                          aria-label={`Medición manual en galones, ${ln.producto_nombre || ln.producto_id}`}
                        />
                      ) : (
                        <span className="tabular-nums text-gray-800">{fmtNum(ln.medicion_litros)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                      {diffMostrar !== null && diffMostrar !== undefined ? fmtNum(diffMostrar) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${semaforoClass(semClass)}`}
                      >
                        {semTexto}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {esBorrador && (
          <p className="mt-3 text-xs text-gray-500">
            Cantidades en galones. La columna <strong className="text-gray-700">Diferencia</strong> y el semáforo se
            actualizan al escribir la medición manual: diferencia = medición − teórico (el teórico viene de saldo inicial,
            ventas consolidado e ingresos declarados de la consolidación).
            Las facturas de compra de combustible vinculadas recalculan automáticamente la columna{' '}
            <strong className="text-gray-700">Ingresos declarados</strong> por producto.
          </p>
        )}

        {(detalle.compras_combustible_vinculadas || []).length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <h2 className="px-4 py-3 text-sm font-semibold text-gray-800 border-b border-gray-100">
              Facturas de combustible incluidas en esta conciliación
            </h2>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Proveedor</th>
                  <th className="px-3 py-2 font-medium">Emisión</th>
                  <th className="px-3 py-2 font-medium text-right">Gal combustible</th>
                  <th className="px-3 py-2 font-medium">Estado logística</th>
                </tr>
              </thead>
              <tbody>
                {detalle.compras_combustible_vinculadas.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-gray-900">{c.codigo_interno}</td>
                    <td className="px-3 py-2 text-gray-700">{c.proveedor_razon_social || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtDateOnly(c.fecha_emision)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(c.galones_combustible)}</td>
                    <td className="px-3 py-2 text-gray-700">{labelEstadoCombustible(c.estado_combustible_logistica)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!esBorrador && detalle.observaciones_cierre && (
          <p className="mt-4 text-sm text-gray-700">
            <span className="font-medium">Cierre:</span> {detalle.observaciones_cierre}
          </p>
        )}

        {modalConfirmarCerrar && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirm-cerrar-stock"
            onClick={(e) => {
              if (!saving && e.target === e.currentTarget) setModalConfirmarCerrar(false)
            }}
          >
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
              <div className="flex gap-3 mb-3">
                <div className="p-2 rounded-full bg-amber-100 text-amber-800 shrink-0">
                  <AlertTriangle className="w-6 h-6" aria-hidden />
                </div>
                <div>
                  <h3 id="titulo-confirm-cerrar-stock" className="text-lg font-semibold text-gray-900">
                    ¿Cerrar conciliación de stock?
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Se guardarán en el servidor las <strong className="text-gray-800">mediciones manuales</strong> y las
                    observaciones de cabecera que ve en pantalla; la fecha de corte es la de la consolidación. Después se
                    cerrará el documento. No podrá editarlo después.
                  </p>
                </div>
              </div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones de cierre (opcional)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] mb-4"
                value={obsCierre}
                onChange={(e) => setObsCierre(e.target.value)}
                rows={3}
                placeholder="Ej. corte varilla 08:00, novedades…"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalConfirmarCerrar(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={ejecutarCierreConciliacion}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando y cerrando…' : 'Guardar y cerrar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalExitoCerrar && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-exito-cerrar-stock"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalExitoCerrar(null)
            }}
          >
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
              <div className="flex gap-3 mb-4">
                <div className="p-2 rounded-full bg-green-100 text-green-700 shrink-0">
                  <CheckCircle className="w-7 h-7" aria-hidden />
                </div>
                <div>
                  <h3 id="titulo-exito-cerrar-stock" className="text-lg font-semibold text-gray-900">
                    Conciliación cerrada
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Consolidación #{modalExitoCerrar.consolidacionId} · Conciliación #{modalExitoCerrar.conciliacionId}.
                    Las mediciones y el cálculo de diferencias quedaron guardados y puede revisarlos en la grilla.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                onClick={() => setModalExitoCerrar(null)}
              >
                Aceptar
              </button>
            </div>
          </div>
        )}

        {modalCompras && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-compras-titulo"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalCompras(false)
            }}
          >
            <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
                <h2 id="modal-compras-titulo" className="text-lg font-semibold text-gray-900">
                  Compras de combustible y consolidación de stock
                </h2>
                <button
                  type="button"
                  onClick={() => setModalCompras(false)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-6">
                {errorComprasModal && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {errorComprasModal}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    Facturas con combustible aún no incluidas en ninguna conciliación de stock
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Marque el estado logístico (comprado / en tanques), guarde si cambió, luego seleccione e incluya en
                    esta conciliación. Solo se admiten facturas en «comprado» o «en tanques».
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-2 py-2 w-10" />
                          <th className="px-2 py-2 font-medium">Código</th>
                          <th className="px-2 py-2 font-medium">Proveedor</th>
                          <th className="px-2 py-2 font-medium">Emisión</th>
                          <th className="px-2 py-2 font-medium text-right">Gal</th>
                          <th className="px-2 py-2 font-medium">Estado</th>
                          <th className="px-2 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {loadingComprasModal && disponibles.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                              Cargando…
                            </td>
                          </tr>
                        )}
                        {!loadingComprasModal && disponibles.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                              No hay facturas pendientes de vincular.
                            </td>
                          </tr>
                        )}
                        {disponibles.map((r) => (
                          <tr key={r.id} className="border-t border-gray-100">
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={!!selDisponibles[r.id]}
                                onChange={(e) =>
                                  setSelDisponibles((prev) => ({ ...prev, [r.id]: e.target.checked }))
                                }
                                aria-label={`Incluir ${r.codigo_interno}`}
                              />
                            </td>
                            <td className="px-2 py-2 font-mono text-gray-900">{r.codigo_interno}</td>
                            <td className="px-2 py-2 text-gray-700 max-w-[200px] truncate" title={r.proveedor_razon_social}>
                              {r.proveedor_razon_social || '—'}
                            </td>
                            <td className="px-2 py-2 text-gray-600">{fmtDateOnly(r.fecha_emision)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{fmtNum(r.galones_combustible)}</td>
                            <td className="px-2 py-2">
                              <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-xs max-w-[140px]"
                                value={estadoDraft[r.id] || 'en_tanques'}
                                onChange={(e) =>
                                  setEstadoDraft((prev) => ({ ...prev, [r.id]: e.target.value }))
                                }
                              >
                                <option value="comprado">Comprado</option>
                                <option value="en_tanques">En tanques</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                disabled={savingCompraEstado === r.id}
                                onClick={() => guardarEstadoCompraDisponible(r.id)}
                                className="text-primary-700 hover:underline text-xs font-medium disabled:opacity-50"
                              >
                                {savingCompraEstado === r.id ? 'Guardando…' : 'Guardar estado'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingVinculo || loadingComprasModal}
                      onClick={vincularSeleccionadas}
                      className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {savingVinculo ? 'Procesando…' : 'Incluir seleccionadas en esta conciliación'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingComprasModal}
                      onClick={recargarDisponiblesModal}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Actualizar listado
                    </button>
                  </div>
                </div>

                {esBorrador && (detalle.compras_combustible_vinculadas || []).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Vinculadas a este borrador (quitar)</h3>
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                      {detalle.compras_combustible_vinculadas.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="font-mono text-gray-900">{c.codigo_interno}</span>
                          <span className="text-gray-600">{fmtNum(c.galones_combustible)} gal</span>
                          <button
                            type="button"
                            disabled={savingVinculo}
                            onClick={() => quitarCompraVinculada(c.id)}
                            className="text-red-700 hover:underline text-xs font-medium disabled:opacity-50"
                          >
                            Quitar de la conciliación
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
            <Fuel className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Conciliación stock combustible</h1>
            <p className="text-sm text-gray-600">
              Inventario de combustible en galones, por consolidación de liquidación cerrada. Semáforo (servidor):
              verde ≤ 0,5 %, amarillo ≤ 1 % sobre el saldo teórico (gal).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (tab === 'pendientes' ? cargarPendientes() : cargarHistorial())}
          disabled={loadingLista}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingLista ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'pendientes' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setTab('pendientes')}
        >
          Pendientes
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'historial' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setTab('historial')}
        >
          Historial cerradas
        </button>
      </div>

      {errorLista && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorLista}</div>
      )}

      {tab === 'pendientes' && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Registrado</th>
                <th className="px-3 py-2 font-medium text-right">Turnos</th>
                <th className="px-3 py-2 font-medium">Rango fechas turno</th>
                <th className="px-3 py-2 font-medium">Conciliación</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pendientes.length === 0 && !loadingLista && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No hay consolidaciones pendientes de conciliar stock.
                  </td>
                </tr>
              )}
              {pendientes.map((row) => (
                <tr key={row.consolidacion_id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-gray-900">{row.codigo}</td>
                  <td className="px-3 py-2 text-gray-700">{fmtDate(row.registrado_en)}</td>
                  <td className="px-3 py-2 text-right">{row.cantidad_turnos}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">
                    {fmtDateOnly(row.fecha_turno_desde)} — {fmtDateOnly(row.fecha_turno_hasta)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {row.conciliacion_stock_id ? (
                      <span>
                        #{row.conciliacion_stock_id}{' '}
                        <span className="text-gray-500">({row.conciliacion_stock_estado || '—'})</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin borrador</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => abrirDetalle(row)}
                      disabled={loadingDetalle}
                      className="text-primary-700 hover:underline text-sm font-medium disabled:opacity-50"
                    >
                      {row.conciliacion_stock_id ? 'Continuar' : 'Conciliar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'historial' && (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Consolidación</th>
                <th className="px-3 py-2 font-medium">Cerrada</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 && !loadingLista && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No hay conciliaciones cerradas recientes.
                  </td>
                </tr>
              )}
              {historial.map((h) => (
                <tr key={h.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">{h.id}</td>
                  <td className="px-3 py-2">#{h.consolidacion_liquidacion_id}</td>
                  <td className="px-3 py-2 text-gray-700">{fmtDate(h.cerrada_en)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => abrirHistorialItem(h)}
                      disabled={loadingDetalle}
                      className="text-primary-700 hover:underline text-sm font-medium disabled:opacity-50"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
