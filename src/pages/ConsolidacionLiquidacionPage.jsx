import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Landmark,
  ListOrdered,
  CalendarRange,
  Trash2,
  Eye,
  PanelRightOpen,
  X,
  Loader2,
  Fuel,
  Unlock,
} from 'lucide-react'
import {
  getGriferosCerradosParaConsolidar,
  listarConsolidacionesLiquidacion,
  obtenerConsolidacionLiquidacion,
  eliminarConsolidacionLiquidacion,
  crearConsolidacionLiquidacion,
  reabrirConsolidacionLiquidacionCerrada,
} from '../utils/api'
import TabLiquidacionPorTipoTurno from './TabLiquidacionPorTipoTurno'
import { ConsolidacionOperativaPanel } from '../components/ConsolidacionOperativaPanel'
import EtiquetaTurnoConfig from '../components/EtiquetaTurnoConfig'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function toYMD(d) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

/** Fechas de turno incluidos: un día si min=max; si no, menor — mayor. */
function formatoRangoFechasTurno(desde, hasta) {
  const ymd = (v) => {
    if (v == null || v === '') return null
    const s = String(v).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
    return s
  }
  const a = ymd(desde)
  const b = ymd(hasta)
  if (!a && !b) return '—'
  const fmt = (s) => format(new Date(`${s}T12:00:00`), 'dd/MM/yyyy', { locale: es })
  const da = a ? fmt(a) : null
  const db = b ? fmt(b) : null
  if (da && db && da === db) return da
  if (da && db) return `${da} — ${db}`
  return da || db || '—'
}

/** Prefijo para filtrar en consola del navegador (F12 → Consola). */
const LOG_CONS = '[Consolidación liquidación]'

export default function ConsolidacionLiquidacionPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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
  const [pendientes, setPendientes] = useState([])
  const [loadingPend, setLoadingPend] = useState(false)
  const [panelConsolidacionId, setPanelConsolidacionId] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [modalObs, setModalObs] = useState(false)
  const [obsConsolidacion, setObsConsolidacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [eliminandoConsolidacionId, setEliminandoConsolidacionId] = useState(null)
  /** Modal eliminar: null | { id, codigo, loading, error, turnos } */
  const [modalEliminarConsolidacion, setModalEliminarConsolidacion] = useState(null)
  /** Tras POST /consolidaciones OK: popup de éxito (además del panel operativo). */
  const [modalExitoCrear, setModalExitoCrear] = useState(null)
  /** Reabrir consolidación cerrada → pendiente: null | { id, codigo, error?: string | null } */
  const [modalConfirmarReabrir, setModalConfirmarReabrir] = useState(null)
  const [reabriendoConsolidacion, setReabriendoConsolidacion] = useState(false)
  /** Fuerza remontar el panel si la misma consolidación pasa de cerrada a pendiente. */
  const [panelMountKey, setPanelMountKey] = useState(0)
  const tabRef = useRef(tab)
  const mensajeTimeoutRef = useRef(null)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(
    () => () => {
      if (mensajeTimeoutRef.current) {
        clearTimeout(mensajeTimeoutRef.current)
        mensajeTimeoutRef.current = null
      }
    },
    []
  )

  const dismissMensajeFlotante = useCallback(() => {
    if (mensajeTimeoutRef.current) {
      clearTimeout(mensajeTimeoutRef.current)
      mensajeTimeoutRef.current = null
    }
    setMensaje(null)
  }, [])

  const mostrarMensaje = useCallback((texto, tipo = 'success') => {
    if (mensajeTimeoutRef.current) {
      clearTimeout(mensajeTimeoutRef.current)
      mensajeTimeoutRef.current = null
    }
    setMensaje({ texto, tipo })
    const duracion = tipo === 'error' ? 6000 : 3500
    mensajeTimeoutRef.current = setTimeout(() => {
      mensajeTimeoutRef.current = null
      setMensaje(null)
    }, duracion)
  }, [])

  const cargarCerrados = useCallback(
    async (avisoListaActualizada = false, motivo = 'sin detalle') => {
      console.info(LOG_CONS, 'cargarCerrados → inicio', {
        motivo,
        avisoListaActualizada,
        fechaDesde,
        fechaHasta,
        nota: 'Solo lista turnos elegibles (GET). No crea consolidación.',
      })
      try {
        setLoadingCerrados(true)
        const data = await getGriferosCerradosParaConsolidar({
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        })
        const rows = Array.isArray(data) ? data : []
        console.info(LOG_CONS, 'cargarCerrados → datos recibidos', {
          filas: rows.length,
          idsEnLista: rows.map((r) => r.id),
          codigos: rows.map((r) => r.codigo),
        })
        setCerrados(rows)
        const validIds = new Set(rows.map((r) => r.id))
        setSelected((prev) => {
          const next = new Set()
          for (const id of prev) {
            if (validIds.has(id)) next.add(id)
          }
          const quitados = prev.size - next.size
          if (quitados > 0) {
            console.info(LOG_CONS, 'Selección: quitados del Set por ya no estar en el listado', {
              quitados,
              antes: [...prev],
              despues: [...next],
            })
          }
          console.info(LOG_CONS, 'Selección actual (ids de turno_cabecera_grifero)', {
            cantidad: next.size,
            ids: [...next],
          })
          return next
        })
        if (avisoListaActualizada) {
          mostrarMensaje('Lista de turnos actualizada')
        }
        console.info(LOG_CONS, 'cargarCerrados → fin OK')
      } catch (e) {
        console.error(LOG_CONS, 'cargarCerrados → error', e)
        mostrarMensaje(e.response?.data?.detail || 'Error al cargar turnos cerrados', 'error')
        setCerrados([])
        setSelected(new Set())
      } finally {
        setLoadingCerrados(false)
      }
    },
    [fechaDesde, fechaHasta, mostrarMensaje]
  )

  const cargarHistorial = useCallback(async () => {
    try {
      setLoadingHist(true)
      const data = await listarConsolidacionesLiquidacion(80, 'cerrada')
      setHistorial(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      mostrarMensaje(e.response?.data?.detail || 'Error al cargar historial', 'error')
    } finally {
      setLoadingHist(false)
    }
  }, [mostrarMensaje])

  const cargarPendientes = useCallback(async () => {
    try {
      setLoadingPend(true)
      const data = await listarConsolidacionesLiquidacion(100, 'pendiente')
      setPendientes(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      mostrarMensaje(e.response?.data?.detail || 'Error al cargar liquidaciones pendientes', 'error')
    } finally {
      setLoadingPend(false)
    }
  }, [mostrarMensaje])

  const abrirModalEliminarConsolidacion = useCallback(async (h) => {
    dismissMensajeFlotante()
    const codigo = h.codigo || `#${h.id}`
    setModalEliminarConsolidacion({
      id: h.id,
      codigo,
      loading: true,
      error: null,
      turnos: [],
    })
    try {
      const det = await obtenerConsolidacionLiquidacion(h.id)
      const turnos = Array.isArray(det?.turnos) ? det.turnos : []
      setModalEliminarConsolidacion((prev) =>
        prev && prev.id === h.id
          ? { ...prev, loading: false, error: null, turnos }
          : prev
      )
    } catch (e) {
      const msg = e.response?.data?.detail || 'No se pudo cargar el detalle de la consolidación'
      setModalEliminarConsolidacion((prev) =>
        prev && prev.id === h.id ? { ...prev, loading: false, error: msg, turnos: [] } : prev
      )
    }
  }, [dismissMensajeFlotante])

  const cerrarModalEliminarConsolidacion = useCallback(() => {
    setModalEliminarConsolidacion(null)
  }, [])

  const confirmarEliminarConsolidacionDesdeModal = useCallback(async () => {
    const m = modalEliminarConsolidacion
    if (!m?.id) return
    try {
      setEliminandoConsolidacionId(m.id)
      await eliminarConsolidacionLiquidacion(m.id)
      mostrarMensaje('Consolidación eliminada')
      setModalEliminarConsolidacion(null)
      setPanelConsolidacionId((prev) => (prev === m.id ? null : prev))
      await cargarPendientes()
      void cargarCerrados(false, 'tras eliminar consolidación pendiente')
    } catch (e) {
      mostrarMensaje(e.response?.data?.detail || 'No se pudo eliminar la consolidación', 'error')
    } finally {
      setEliminandoConsolidacionId(null)
    }
  }, [modalEliminarConsolidacion, cargarPendientes, cargarCerrados, mostrarMensaje])

  useEffect(() => {
    if (tab === 'consolidacion') {
      void cargarCerrados(false, 'useEffect: pestaña «Elegir turnos» activa o cambió cargarCerrados (p. ej. fechas)')
    }
  }, [tab, cargarCerrados])

  useEffect(() => {
    if (tab === 'historial') cargarHistorial()
  }, [tab, cargarHistorial])

  useEffect(() => {
    if (tab === 'pendientes') cargarPendientes()
  }, [tab, cargarPendientes])

  /** Precarga consolidaciones pendientes al entrar a la ruta (la pestaña por defecto es otra). */
  useEffect(() => {
    void cargarPendientes()
  }, [cargarPendientes])

  useEffect(() => {
    if (location.pathname !== '/turno-consolidacion-liquidacion') return
    if (location.state?.__menuReselect == null) return
    const yaEnConsolidacion = tabRef.current === 'consolidacion'
    setTab('consolidacion')
    if (yaEnConsolidacion) {
      void cargarCerrados(true, 'menú lateral: misma ruta (ya en pestaña elegir turnos)')
    }
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, cargarCerrados, navigate])

  const irATab = (id) => {
    if (tab === id) {
      if (id === 'consolidacion') {
        console.warn(
          LOG_CONS,
          'Clic en la MISMA pestaña «Elegir turnos (cerrados)».',
          'Esto solo vuelve a ejecutar GET /grifero/cerrados-para-consolidar.',
          'NO llama POST /consolidaciones. Para crear: marque turnos y pulse «Crear consolidación» en la cabecera.'
        )
        void cargarCerrados(true, 're-clic en pestaña elegir turnos')
      } else if (id === 'pendientes') {
        console.info(LOG_CONS, 'Re-clic pestaña pendientes → recargar lista')
        void cargarPendientes()
      } else if (id === 'historial') {
        console.info(LOG_CONS, 'Re-clic pestaña historial → recargar lista')
        void cargarHistorial()
      }
      return
    }
    console.info(LOG_CONS, 'Cambio de pestaña', { de: tab, a: id })
    setTab(id)
  }

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

  const abrirModalGuardar = () => {
    const ids = Array.from(selected)
    console.info(LOG_CONS, 'Crear consolidación (abrir modal)', {
      cantidadSeleccionados: ids.length,
      turno_cabecera_grifero_ids: ids,
    })
    if (selected.size === 0) {
      console.warn(LOG_CONS, 'Modal no abierto: ningún turno marcado')
      mostrarMensaje('Seleccione al menos un turno cerrado', 'error')
      return
    }
    dismissMensajeFlotante()
    setObsConsolidacion('')
    setModalObs(true)
    console.info(LOG_CONS, 'Modal de confirmación abierto; al confirmar se hará POST /consolidaciones')
  }

  const confirmarConsolidacion = async () => {
    const payload = {
      turno_cabecera_grifero_ids: Array.from(selected),
      observaciones: obsConsolidacion.trim() || null,
      fechas_venta_servicentro: [],
      fechas_cobranza: [],
    }
    console.info(LOG_CONS, 'confirmarConsolidacion → enviando POST /consolidaciones', payload)
    try {
      setGuardando(true)
      const created = await crearConsolidacionLiquidacion(payload)
      console.info(LOG_CONS, 'confirmarConsolidacion → respuesta backend', created)
      setModalObs(false)
      await cargarCerrados(false, 'tras crear consolidación: refrescar turnos aún sin consolidar')
      await cargarPendientes()
      await cargarHistorial()
      setTab('pendientes')
      if (created?.id) {
        console.info(LOG_CONS, 'Abriendo panel operativo consolidación id=', created.id)
        setPanelConsolidacionId(created.id)
        setModalExitoCrear({
          id: created.id,
          codigo: created.codigo || `#${created.id}`,
          cantidad_turnos: created.cantidad_turnos ?? payload.turno_cabecera_grifero_ids.length,
        })
      } else {
        console.warn(LOG_CONS, 'Respuesta sin id; no se abre panel', created)
        mostrarMensaje('Consolidación registrada, pero la respuesta no incluyó id. Revise el listado pendiente.', 'error')
      }
    } catch (e) {
      console.error(LOG_CONS, 'confirmarConsolidacion → fallo', {
        status: e.response?.status,
        detail: e.response?.data?.detail ?? e.response?.data,
      })
      const d = e.response?.data?.detail
      mostrarMensaje(typeof d === 'string' ? d : e.message || 'Error al registrar', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const abrirPanelConsolidacion = (id) => setPanelConsolidacionId(id)

  const refrescarListasConsolidacion = useCallback(() => {
    cargarPendientes()
    cargarHistorial()
  }, [cargarPendientes, cargarHistorial])

  const ejecutarReabrirConsolidacionDesdeListado = async () => {
    if (!modalConfirmarReabrir?.id) return
    const id = modalConfirmarReabrir.id
    setReabriendoConsolidacion(true)
    setModalConfirmarReabrir((prev) => (prev ? { ...prev, error: null } : prev))
    try {
      await reabrirConsolidacionLiquidacionCerrada(id)
      setModalConfirmarReabrir(null)
      mostrarMensaje('Consolidación reabierta (pendiente).')
      await refrescarListasConsolidacion()
      if (panelConsolidacionId === id) {
        setPanelMountKey((k) => k + 1)
      }
    } catch (e) {
      const d = e.response?.data?.detail
      const msg = typeof d === 'string' ? d : e.message || 'No se pudo reabrir'
      setModalConfirmarReabrir((prev) => (prev?.id === id ? { ...prev, error: msg } : prev))
    } finally {
      setReabriendoConsolidacion(false)
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
              { id: 'consolidacion', label: 'Elegir turnos (cerrados, sin consolidar)' },
              { id: 'pendientes', label: 'Liquidaciones pendientes' },
              { id: 'historial', label: 'Historial (cerradas)' },
              { id: 'liquidacion_dia', label: 'Liquidación del día (tipo de turno)' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => irATab(t.id)}
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
          {tab === 'consolidacion' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 max-w-2xl">
                Marque turnos en la tabla y pulse <strong className="text-gray-700">Crear consolidación</strong> para enviar{' '}
                <strong className="text-gray-700">POST /consolidaciones</strong>. La pestaña solo actualiza el listado (GET).
                Consola: filtrar por{' '}
                <code className="text-gray-700 bg-gray-100 px-1 rounded">Consolidación liquidación</code>.
              </p>
              <button
                type="button"
                onClick={abrirModalGuardar}
                disabled={selected.size === 0 || loadingCerrados}
                title={
                  selected.size === 0 && !loadingCerrados
                    ? 'Marque al menos un turno en la tabla'
                    : `${selected.size} turno(s) seleccionado(s)`
                }
                className="btn btn-primary inline-flex items-center gap-2 shrink-0"
              >
                <Landmark className="w-5 h-5" />
                Crear consolidación
                {selected.size > 0 && (
                  <span className="text-sm font-normal opacity-90">({selected.size})</span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {mensaje && (
        <div
          role="status"
          className={`fixed top-24 left-1/2 z-40 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 ${
            mensaje.tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white px-5 py-3 rounded-lg shadow-lg flex flex-col items-center justify-center text-center gap-2`}
        >
          {mensaje.tipo === 'success' ? (
            <CheckCircle className="w-6 h-6 shrink-0 opacity-95" aria-hidden />
          ) : (
            <AlertCircle className="w-6 h-6 shrink-0 opacity-95" aria-hidden />
          )}
          <span className="text-sm leading-relaxed">{mensaje.texto}</span>
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
                  onClick={() => cargarCerrados(false, 'botón «Actualizar lista»')}
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
                    Turnos cerrados a incluir en la consolidación. El efectivo por turno se revisa en cada cierre de turno.
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>
                    <span className="text-gray-600">Seleccionados:</span>{' '}
                    <strong>{selected.size}</strong> turno(s)
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
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCerrados ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          Cargando…
                        </td>
                      </tr>
                    ) : cerrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'pendientes' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Liquidaciones pendientes de cierre
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Abra una consolidación para ver combustible, venta de productos, GNV, POS, guías (solo lectura) y registrar
                  venta servicentro y cobranzas (factura, retención y monto cobrado). Use &quot;Cerrar consolidación&quot; cuando
                  termine.
                </p>
              </div>
              <button
                type="button"
                onClick={cargarPendientes}
                disabled={loadingPend}
                className="btn btn-secondary btn-sm inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPend ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Código</th>
                    <th className="p-3 text-left">Fechas turno</th>
                    <th className="p-3 text-right">Turnos</th>
                    <th className="p-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPend ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Cargando…
                      </td>
                    </tr>
                  ) : pendientes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No hay consolidaciones pendientes.
                      </td>
                    </tr>
                  ) : (
                    pendientes.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{h.codigo}</td>
                        <td className="p-3 whitespace-nowrap">
                          {formatoRangoFechasTurno(h.fecha_turno_desde, h.fecha_turno_hasta)}
                        </td>
                        <td className="p-3 text-right">{h.cantidad_turnos}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              className="btn btn-secondary text-xs px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5"
                              onClick={() => abrirPanelConsolidacion(h.id)}
                              title="Abrir panel con detalle y operaciones"
                            >
                              <PanelRightOpen className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              <span className="hidden sm:inline">Abrir detalle</span>
                              <span className="sm:hidden">Detalle</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary text-xs px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 text-red-700 border border-red-200 bg-white hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                              disabled={
                                !!modalEliminarConsolidacion ||
                                eliminandoConsolidacionId === h.id ||
                                loadingPend
                              }
                              onClick={() => abrirModalEliminarConsolidacion(h)}
                              title="Eliminar esta consolidación pendiente"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              <span className="hidden sm:inline">Eliminar</span>
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

        {tab === 'historial' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ListOrdered className="w-5 h-5" />
                Consolidaciones cerradas
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
                    <th className="p-3 text-left">Fechas turno</th>
                    <th className="p-3 text-right">Turnos</th>
                    <th className="p-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHist ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Cargando…
                      </td>
                    </tr>
                  ) : historial.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Sin consolidaciones registradas.
                      </td>
                    </tr>
                  ) : (
                    historial.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="p-3 font-mono text-xs">{h.codigo}</td>
                        <td className="p-3 whitespace-nowrap">
                          {formatoRangoFechasTurno(h.fecha_turno_desde, h.fecha_turno_hasta)}
                        </td>
                        <td className="p-3 text-right">{h.cantidad_turnos}</td>
                        <td className="p-3">
                          <div className="flex flex-col sm:flex-row flex-wrap gap-1.5 items-start">
                            <button
                              type="button"
                              className="btn btn-secondary text-xs px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5"
                              onClick={() => abrirPanelConsolidacion(h.id)}
                              title="Ver consolidación cerrada"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              Ver detalle
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary text-xs px-2.5 py-1.5 rounded-md inline-flex items-center gap-1.5 text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                              disabled={
                                !!modalConfirmarReabrir ||
                                !!modalEliminarConsolidacion ||
                                reabriendoConsolidacion
                              }
                              title="Volver a estado pendiente (bloqueado si la conciliación de stock sigue cerrada)"
                              onClick={() => {
                                dismissMensajeFlotante()
                                setModalConfirmarReabrir({ id: h.id, codigo: h.codigo || `#${h.id}` })
                              }}
                            >
                              <Unlock className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              Reabrir
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

      {modalEliminarConsolidacion && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-eliminar-cons-titulo"
        >
          <div className="card p-0 max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-red-100">
            <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/90 flex items-start gap-3">
              <div className="shrink-0 rounded-full bg-amber-100 p-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="modal-eliminar-cons-titulo" className="text-lg font-semibold text-gray-900">
                  Eliminar consolidación pendiente
                </h3>
                <p className="text-sm text-gray-700 mt-1 font-mono">{modalEliminarConsolidacion.codigo}</p>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white/80 hover:text-gray-800 shrink-0"
                onClick={cerrarModalEliminarConsolidacion}
                disabled={!!eliminandoConsolidacionId}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-950">
                <p>
                  Los <strong>turnos dejarán de estar consolidados</strong> y podrán incluirse en una nueva
                  consolidación. Las <strong>ventas servicentro</strong> y <strong>cobranzas</strong> vinculadas
                  quedarán otra vez <strong>pendientes</strong> de consolidar.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <Fuel className="w-4 h-4 text-gray-600 shrink-0" aria-hidden />
                  Turnos incluidos en esta consolidación
                </h4>
                {modalEliminarConsolidacion.loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 py-6 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                    Cargando lista de turnos…
                  </div>
                ) : modalEliminarConsolidacion.error ? (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                    {modalEliminarConsolidacion.error}
                  </p>
                ) : modalEliminarConsolidacion.turnos.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No se listaron turnos en la respuesta. Aún puede eliminar la consolidación si corresponde.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1.5 bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200">
                      <span className="sm:col-span-3">Código</span>
                      <span className="sm:col-span-3">Fecha turno</span>
                      <span className="sm:col-span-4">Tipo / isla</span>
                      <span className="sm:col-span-2 text-right">Grifero</span>
                    </div>
                    <ul className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto text-sm">
                    {modalEliminarConsolidacion.turnos.map((t) => (
                      <li
                        key={t.id}
                        className="px-3 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2 items-start sm:items-center bg-white"
                      >
                        <div className="sm:col-span-3 font-mono text-xs font-semibold text-primary-800">
                          {t.turno_codigo}
                        </div>
                        <div className="sm:col-span-3 text-xs text-gray-600 tabular-nums">
                          {t.fecha_turno
                            ? format(
                                new Date(`${String(t.fecha_turno).slice(0, 10)}T12:00:00`),
                                'dd/MM/yyyy',
                                { locale: es }
                              )
                            : '—'}
                        </div>
                        <div className="sm:col-span-4 text-xs truncate" title={t.turno_config_etiqueta || ''}>
                          <EtiquetaTurnoConfig texto={t.turno_config_etiqueta} />
                        </div>
                        <div className="sm:col-span-2 text-xs text-gray-700 truncate text-left sm:text-right" title={t.empleado_nombre}>
                          {t.empleado_nombre || '—'}
                        </div>
                      </li>
                    ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/80 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-2"
                onClick={cerrarModalEliminarConsolidacion}
                disabled={!!eliminandoConsolidacionId}
              >
                <X className="w-4 h-4 shrink-0" aria-hidden />
                Cancelar
              </button>
              <button
                type="button"
                className="btn inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-red-700 disabled:opacity-60"
                onClick={confirmarEliminarConsolidacionDesdeModal}
                disabled={
                  !!eliminandoConsolidacionId ||
                  modalEliminarConsolidacion.loading ||
                  !!modalEliminarConsolidacion.error
                }
              >
                {eliminandoConsolidacionId === modalEliminarConsolidacion.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 shrink-0" aria-hidden />
                    Sí, eliminar consolidación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalObs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Confirmar consolidación</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se registrarán <strong>{selected.size}</strong> turno(s) en esta consolidación.
            </p>
            <p className="text-xs text-gray-600 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
              Las ventas <strong>servicentro</strong> y <strong>cobranzas</strong> pendientes cuya fecha esté entre la
              fecha de turno mínima y la máxima de los turnos seleccionados se vincularán automáticamente a esta
              consolidación (no hace falta elegir días).
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea
              className="input w-full min-h-[80px] mb-4"
              value={obsConsolidacion}
              onChange={(e) => setObsConsolidacion(e.target.value)}
              placeholder="Ej. Depósito mañana turno noche + cierre anterior"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setModalObs(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={confirmarConsolidacion}
                disabled={guardando}
              >
                {guardando ? 'Creando…' : 'Crear consolidación (pendiente)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panelConsolidacionId != null && (
        <ConsolidacionOperativaPanel
          key={`${panelConsolidacionId}-${panelMountKey}`}
          consolidacionId={panelConsolidacionId}
          onClose={() => {
            setPanelConsolidacionId(null)
            refrescarListasConsolidacion()
          }}
          onMensaje={mostrarMensaje}
          onCerrada={refrescarListasConsolidacion}
          onDismissFloatingMessage={dismissMensajeFlotante}
        />
      )}

      {modalConfirmarReabrir && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-reabrir-cons-liq"
          onClick={(e) => {
            if (!reabriendoConsolidacion && e.target === e.currentTarget) setModalConfirmarReabrir(null)
          }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <div className="flex gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 text-amber-800 shrink-0">
                <Unlock className="w-6 h-6" aria-hidden />
              </div>
              <div>
                <h3 id="titulo-reabrir-cons-liq" className="text-lg font-semibold text-gray-900">
                  ¿Reabrir consolidación de liquidación?
                </h3>
                <p className="text-sm text-gray-600 mt-2 font-mono">{modalConfirmarReabrir.codigo}</p>
                <p className="text-sm text-gray-600 mt-2">
                  La consolidación volverá a estado <strong className="text-gray-800">pendiente</strong> para editar
                  servicentro, cobranzas y reabrir turnos de grifero si corresponde.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Si la <strong className="text-gray-800">conciliación de inventario de combustible</strong> de esta
                  misma consolidación sigue <strong className="text-gray-800">cerrada</strong>, primero ábrala en{' '}
                  <strong className="text-gray-800">Supervisión → Conciliación stock combustible</strong>, pestaña de
                  cerradas, y use <strong className="text-gray-800">Reabrir</strong>; luego podrá reabrir esta
                  consolidación.
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  Si el sistema no le permite esta acción, pida apoyo a un supervisor con acceso a consolidación y
                  conciliación de stock.
                </p>
                {modalConfirmarReabrir.error ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 flex gap-2 items-start"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
                    <p className="leading-relaxed">{modalConfirmarReabrir.error}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={reabriendoConsolidacion}
                onClick={() => setModalConfirmarReabrir(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reabriendoConsolidacion}
                onClick={ejecutarReabrirConsolidacionDesdeListado}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {reabriendoConsolidacion ? 'Reabriendo…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExitoCrear && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-exito-crear-cons"
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-md w-full">
            <div className="flex gap-3 mb-4">
              <div className="p-2 rounded-full bg-green-100 text-green-700 shrink-0">
                <CheckCircle className="w-7 h-7" aria-hidden />
              </div>
              <div>
                <h3 id="titulo-exito-crear-cons" className="text-lg font-semibold text-gray-900">
                  Consolidación creada
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Estado <strong className="text-amber-800">pendiente</strong>. Complete venta servicentro y cobranzas
                  en el panel, luego cierre la consolidación cuando corresponda.
                </p>
              </div>
            </div>
            <dl className="text-sm space-y-2 mb-5 border border-gray-100 rounded-lg p-3 bg-gray-50/80">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Código</dt>
                <dd className="font-mono font-medium text-gray-900">{modalExitoCrear.codigo}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Turnos incluidos</dt>
                <dd className="font-medium text-gray-900">{modalExitoCrear.cantidad_turnos}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => setModalExitoCrear(null)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
