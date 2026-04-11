import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Landmark,
  ListOrdered,
  CalendarRange,
} from 'lucide-react'
import {
  getGriferosCerradosParaConsolidar,
  listarConsolidacionesLiquidacion,
  crearConsolidacionLiquidacion,
} from '../utils/api'
import TabLiquidacionPorTipoTurno from './TabLiquidacionPorTipoTurno'
import { ConsolidacionOperativaPanel } from '../components/ConsolidacionOperativaPanel'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function toYMD(d) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
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
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  const mostrarMensaje = useCallback((texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    const duracion = tipo === 'error' ? 6000 : 3500
    setTimeout(() => setMensaje(null), duracion)
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
    setObsConsolidacion('')
    setModalObs(true)
    console.info(LOG_CONS, 'Modal de confirmación abierto; al confirmar se hará POST /consolidaciones')
  }

  const confirmarConsolidacion = async () => {
    const payload = {
      turno_cabecera_grifero_ids: Array.from(selected),
      observaciones: obsConsolidacion.trim() || null,
    }
    console.info(LOG_CONS, 'confirmarConsolidacion → enviando POST /consolidaciones', payload)
    try {
      setGuardando(true)
      const created = await crearConsolidacionLiquidacion(payload)
      console.info(LOG_CONS, 'confirmarConsolidacion → respuesta backend', created)
      setModalObs(false)
      mostrarMensaje('Consolidación creada (pendiente). Complete venta servicentro y cobranzas, luego cierre cuando corresponda.')
      await cargarCerrados(false, 'tras crear consolidación: refrescar turnos aún sin consolidar')
      await cargarPendientes()
      await cargarHistorial()
      setTab('pendientes')
      if (created?.id) {
        console.info(LOG_CONS, 'Abriendo panel operativo consolidación id=', created.id)
        setPanelConsolidacionId(created.id)
      } else {
        console.warn(LOG_CONS, 'Respuesta sin id; no se abre panel', created)
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
                  Abra una consolidación para ver combustible, POS, guías (solo lectura) y registrar venta servicentro
                  y cobranzas (factura, retención y monto cobrado). Use &quot;Cerrar consolidación&quot; cuando termine.
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
                    <th className="p-3 text-left">Registro</th>
                    <th className="p-3 text-right">Turnos</th>
                    <th className="p-3 text-right">Σ Esperado</th>
                    <th className="p-3 text-right">Σ Entregado</th>
                    <th className="p-3 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPend ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Cargando…
                      </td>
                    </tr>
                  ) : pendientes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No hay consolidaciones pendientes.
                      </td>
                    </tr>
                  ) : (
                    pendientes.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{h.codigo}</td>
                        <td className="p-3">
                          {h.registrado_en
                            ? format(new Date(h.registrado_en), 'dd/MM/yyyy HH:mm', { locale: es })
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
                          <button
                            type="button"
                            className="text-primary-600 text-xs font-medium"
                            onClick={() => abrirPanelConsolidacion(h.id)}
                          >
                            Abrir detalle
                          </button>
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
                              onClick={() => abrirPanelConsolidacion(h.id)}
                            >
                              Ver detalle
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
                {guardando ? 'Creando…' : 'Crear consolidación (pendiente)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {panelConsolidacionId != null && (
        <ConsolidacionOperativaPanel
          consolidacionId={panelConsolidacionId}
          onClose={() => {
            setPanelConsolidacionId(null)
            refrescarListasConsolidacion()
          }}
          onMensaje={mostrarMensaje}
          onCerrada={refrescarListasConsolidacion}
        />
      )}
    </div>
  )
}
