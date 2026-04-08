import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Landmark,
  ListOrdered,
  X,
  CalendarRange,
  FileText,
} from 'lucide-react'
import {
  getGriferosCerradosParaConsolidar,
  listarConsolidacionesLiquidacion,
  obtenerConsolidacionLiquidacion,
  crearConsolidacionLiquidacion,
  downloadConsolidacionReportePdf,
} from '../utils/api'
import TabLiquidacionPorTipoTurno from './TabLiquidacionPorTipoTurno'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function toYMD(d) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

export default function ConsolidacionLiquidacionPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('consolidacion')

  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return toYMD(d)
  })
  const [fechaHasta, setFechaHasta] = useState(() => toYMD(new Date()))

  const [cerrados, setCerrados] = useState([])
  const [loadingCerrados, setLoadingCerrados] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [modalObs, setModalObs] = useState(false)
  const [obsConsolidacion, setObsConsolidacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [detalle, setDetalle] = useState(null)

  const mostrarMensaje = useCallback((texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    const duracion = tipo === 'error' ? 6000 : 3500
    setTimeout(() => setMensaje(null), duracion)
  }, [])

  const cargarCerrados = useCallback(async () => {
    try {
      setLoadingCerrados(true)
      const data = await getGriferosCerradosParaConsolidar({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      })
      setCerrados(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch (e) {
      console.error(e)
      mostrarMensaje(e.response?.data?.detail || 'Error al cargar turnos cerrados', 'error')
      setCerrados([])
    } finally {
      setLoadingCerrados(false)
    }
  }, [fechaDesde, fechaHasta, mostrarMensaje])

  const cargarHistorial = useCallback(async () => {
    try {
      setLoadingHist(true)
      const data = await listarConsolidacionesLiquidacion(80)
      setHistorial(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      mostrarMensaje(e.response?.data?.detail || 'Error al cargar historial', 'error')
    } finally {
      setLoadingHist(false)
    }
  }, [mostrarMensaje])

  useEffect(() => {
    if (tab === 'consolidacion') cargarCerrados()
  }, [tab, cargarCerrados])

  useEffect(() => {
    if (tab === 'historial') cargarHistorial()
  }, [tab, cargarHistorial])

  const toggle = (id) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const seleccionarTodos = () => {
    if (selected.size === cerrados.length) setSelected(new Set())
    else setSelected(new Set(cerrados.map((c) => c.id)))
  }

  const totalesSel = useMemo(() => {
    let esp = 0
    let ent = 0
    for (const c of cerrados) {
      if (!selected.has(c.id)) continue
      esp += Number(c.efectivo_esperado || 0)
      ent += Number(c.efectivo_entregado || 0)
    }
    return { esp, ent, dif: ent - esp }
  }, [cerrados, selected])

  const abrirModalGuardar = () => {
    if (selected.size === 0) {
      mostrarMensaje('Seleccione al menos un turno cerrado', 'error')
      return
    }
    setObsConsolidacion('')
    setModalObs(true)
  }

  const confirmarConsolidacion = async () => {
    try {
      setGuardando(true)
      await crearConsolidacionLiquidacion({
        turno_cabecera_grifero_ids: Array.from(selected),
        observaciones: obsConsolidacion.trim() || null,
      })
      setModalObs(false)
      mostrarMensaje('Consolidación registrada correctamente')
      await cargarCerrados()
      await cargarHistorial()
    } catch (e) {
      const d = e.response?.data?.detail
      mostrarMensaje(typeof d === 'string' ? d : e.message || 'Error al registrar', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const verDetalle = async (id) => {
    try {
      const d = await obtenerConsolidacionLiquidacion(id)
      setDetalle(d)
    } catch (e) {
      mostrarMensaje(e.response?.data?.detail || 'No se pudo cargar el detalle', 'error')
    }
  }

  const descargarPdfConsolidacion = async (id, codigo) => {
    try {
      await downloadConsolidacionReportePdf(id, codigo)
    } catch (e) {
      const d = e.response?.data
      let msg = 'No se pudo generar el PDF'
      if (d instanceof Blob) {
        try {
          const t = await d.text()
          const j = JSON.parse(t)
          msg = j.detail || msg
        } catch {
          /* ignore */
        }
      } else if (typeof e.response?.data?.detail === 'string') {
        msg = e.response.data.detail
      }
      mostrarMensaje(msg, 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-8 h-8 text-primary-600" />
            Consolidación y liquidación
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {user?.nombres} {user?.apellidos} — Agrupe turnos de grifero cerrados para totalizar efectivo (envío a
            banco). Puede registrar varias consolidaciones al día.
          </p>
          <nav className="flex gap-2 mt-4 flex-wrap">
            {[
              { id: 'consolidacion', label: 'Consolidar efectivo (turnos cerrados)' },
              { id: 'historial', label: 'Historial de consolidaciones' },
              { id: 'liquidacion_dia', label: 'Liquidación del día (tipo de turno)' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {mensaje && (
        <div
          className={`fixed top-24 right-4 z-50 ${
            mensaje.tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md`}
        >
          {mensaje.tipo === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{mensaje.texto}</span>
        </div>
      )}

      <div className="p-6 max-w-6xl mx-auto">
        {tab === 'liquidacion_dia' && <TabLiquidacionPorTipoTurno />}

        {tab === 'consolidacion' && (
          <div className="space-y-6">
            <div className="card p-5">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha liquidación desde</label>
                  <input
                    type="date"
                    className="input"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fecha liquidación hasta</label>
                  <input
                    type="date"
                    className="input"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => cargarCerrados()}
                  disabled={loadingCerrados}
                  className="btn btn-secondary inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingCerrados ? 'animate-spin' : ''}`} />
                  Actualizar lista
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-3 flex items-start gap-2">
                <CalendarRange className="w-4 h-4 mt-0.5 shrink-0" />
                Solo aparecen turnos de grifero <strong>cerrados</strong> que <strong>aún no</strong> están en ninguna
                consolidación. Amplié el rango si consolida por la mañana turnos del día anterior.
              </p>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 bg-primary-50/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Selección para envío a banco</p>
                  <p className="text-xs text-gray-600">
                    Efectivo esperado (sistema) y entregado (conteo grifero) según cada turno cerrado.
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>
                    <span className="text-gray-600">Seleccionados:</span>{' '}
                    <strong>{selected.size}</strong> turno(s)
                  </p>
                  <p className="text-primary-800 font-semibold">
                    Σ Efectivo esperado: S/ {totalesSel.esp.toFixed(2)} · Σ Entregado: S/ {totalesSel.ent.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-left">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={cerrados.length > 0 && selected.size === cerrados.length}
                          onChange={seleccionarTodos}
                          title="Seleccionar todos"
                        />
                      </th>
                      <th className="p-3">Turno grifero</th>
                      <th className="p-3">Liquidación / tipo</th>
                      <th className="p-3">Fecha turno</th>
                      <th className="p-3">Grifero</th>
                      <th className="p-3 text-right">Efect. esperado</th>
                      <th className="p-3 text-right">Efect. entregado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCerrados ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          Cargando…
                        </td>
                      </tr>
                    ) : cerrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No hay turnos cerrados pendientes de consolidar en este rango.
                        </td>
                      </tr>
                    ) : (
                      cerrados.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selected.has(row.id)}
                              onChange={() => toggle(row.id)}
                            />
                          </td>
                          <td className="p-3 font-mono text-xs">{row.codigo}</td>
                          <td className="p-3">
                            <div className="font-medium">{row.liquidacion_codigo}</div>
                            <div className="text-xs text-gray-500">
                              {row.turno_config_codigo} — {row.turno_config_nombre}
                            </div>
                            <div className="text-xs text-gray-400">
                              Fecha liq.:{' '}
                              {row.liquidacion_fecha
                                ? format(new Date(row.liquidacion_fecha + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
                                : '—'}
                            </div>
                          </td>
                          <td className="p-3 text-sm tabular-nums">
                            {row.fecha_turno
                              ? format(new Date(row.fecha_turno + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
                              : '—'}
                          </td>
                          <td className="p-3">{row.empleado_nombre}</td>
                          <td className="p-3 text-right tabular-nums">
                            S/ {Number(row.efectivo_esperado || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            S/ {Number(row.efectivo_entregado || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={abrirModalGuardar}
                  disabled={selected.size === 0 || loadingCerrados}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <Landmark className="w-5 h-5" />
                  Registrar consolidación
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'historial' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ListOrdered className="w-5 h-5" />
                Últimas consolidaciones
              </h2>
              <button
                type="button"
                onClick={cargarHistorial}
                disabled={loadingHist}
                className="btn btn-secondary btn-sm inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHist ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Fecha registro</th>
                    <th className="p-3 text-right">Turnos</th>
                    <th className="p-3 text-right">Σ Esperado</th>
                    <th className="p-3 text-right">Σ Entregado</th>
                    <th className="p-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHist ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Cargando…
                      </td>
                    </tr>
                  ) : historial.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Sin consolidaciones registradas.
                      </td>
                    </tr>
                  ) : (
                    historial.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="p-3 font-mono text-xs">{h.codigo}</td>
                        <td className="p-3">
                          {h.registrado_en
                            ? format(new Date(h.registrado_en), "dd/MM/yyyy HH:mm", { locale: es })
                            : '—'}
                        </td>
                        <td className="p-3 text-right">{h.cantidad_turnos}</td>
                        <td className="p-3 text-right tabular-nums">
                          S/ {Number(h.suma_efectivo_esperado || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          S/ {Number(h.suma_efectivo_entregado || 0).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              type="button"
                              className="text-primary-600 text-xs font-medium"
                              onClick={() => verDetalle(h.id)}
                            >
                              Ver detalle
                            </button>
                            <button
                              type="button"
                              className="text-gray-700 text-xs font-medium inline-flex items-center gap-1"
                              onClick={() => descargarPdfConsolidacion(h.id, h.codigo)}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalObs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Confirmar consolidación</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se registrarán <strong>{selected.size}</strong> turno(s). Σ efectivo esperado{' '}
              <strong>S/ {totalesSel.esp.toFixed(2)}</strong>, Σ entregado{' '}
              <strong>S/ {totalesSel.ent.toFixed(2)}</strong>.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea
              className="input w-full min-h-[80px] mb-4"
              value={obsConsolidacion}
              onChange={(e) => setObsConsolidacion(e.target.value)}
              placeholder="Ej. Depósito mañana turno noche + cierre anterior"
            />
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setModalObs(false)} disabled={guardando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={confirmarConsolidacion} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold">Consolidación {detalle.codigo}</h3>
                <p className="text-xs text-gray-500">
                  {detalle.registrado_en
                    ? format(new Date(detalle.registrado_en), "dd/MM/yyyy HH:mm", { locale: es })
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                  onClick={() => descargarPdfConsolidacion(detalle.id, detalle.codigo)}
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-700 p-1" onClick={() => setDetalle(null)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-primary-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Σ Efectivo esperado</p>
                <p className="text-xl font-bold">S/ {Number(detalle.suma_efectivo_esperado || 0).toFixed(2)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Σ Efectivo entregado</p>
                <p className="text-xl font-bold">S/ {Number(detalle.suma_efectivo_entregado || 0).toFixed(2)}</p>
              </div>
            </div>
            {detalle.observaciones && (
              <p className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded border">{detalle.observaciones}</p>
            )}
            <h4 className="font-medium text-gray-900 mb-2">Turnos incluidos</h4>
            <ul className="space-y-2 text-sm">
              {(detalle.turnos || []).map((t) => (
                <li key={t.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-xs">{t.turno_codigo}</span>
                    <span className="text-xs text-gray-500">{t.turno_config_etiqueta}</span>
                  </div>
                  <div className="text-xs text-gray-600">{t.empleado_nombre}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Fecha del turno:{' '}
                    {t.fecha_turno
                      ? format(new Date(t.fecha_turno + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
                      : '—'}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span>Esp. S/ {Number(t.efectivo_esperado || 0).toFixed(2)}</span>
                    <span>Ent. S/ {Number(t.efectivo_entregado || 0).toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
