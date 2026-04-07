import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Calendar, Plus, CheckCircle, AlertCircle, Clock, 
  DollarSign, Users, TrendingUp, Lock, Unlock
} from 'lucide-react'
import {
  listarTurnosLiquidacion,
  listarTurnosConfigInfra,
  crearTurnoDia,
  cerrarTurnoDia
} from '../utils/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function safeFormatDate(value, fmt, opts) {
  if (value == null || value === '') return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, fmt, opts)
}

function GestionTurnoDia() {
  const { user } = useAuth()
  
  const [turnosHoy, setTurnosHoy] = useState([])
  const [configsTurno, setConfigsTurno] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [mostrarModalAbrir, setMostrarModalAbrir] = useState(false)
  const [mostrarModalCerrar, setMostrarModalCerrar] = useState(false)
  const [turnoConfigIdAbrir, setTurnoConfigIdAbrir] = useState('')
  const [liquidacionCerrar, setLiquidacionCerrar] = useState(null)
  const [efectivoReal, setEfectivoReal] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const hoyISO = () => new Date().toISOString().split('T')[0]

  const nombreTipoTurno = (turnoConfigId) => {
    const c = configsTurno.find((x) => x.id === turnoConfigId)
    if (!c) return `Config #${turnoConfigId}`
    return `${c.codigo} — ${c.nombre}`
  }

  const configsSinLiquidacionHoy = configsTurno.filter(
    (c) => !turnosHoy.some((t) => t.turno_config_id === c.id)
  )

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const hoy = hoyISO()
      const [liqs, cfgs] = await Promise.all([
        listarTurnosLiquidacion({ fecha_inicio: hoy, fecha_fin: hoy }),
        listarTurnosConfigInfra({ activo: true }),
      ])
      setTurnosHoy(Array.isArray(liqs) ? liqs : [])
      setConfigsTurno(Array.isArray(cfgs) ? cfgs : [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    const duracion = tipo === 'error' ? 5000 : 3000
    setTimeout(() => setMensaje(null), duracion)
  }

  const handleAbrirTurno = async () => {
    const cfgId = Number(turnoConfigIdAbrir)
    if (!cfgId) {
      mostrarMensaje('Seleccione el tipo de turno a abrir', 'error')
      return
    }
    try {
      setProcesando(true)
      const hoy = hoyISO()
      await crearTurnoDia({
        fecha: hoy,
        supervisor_apertura_id: user.id,
        turno_config_id: cfgId,
      })
      await cargarDatos()
      setMostrarModalAbrir(false)
      setTurnoConfigIdAbrir('')
      mostrarMensaje('Liquidación de turno abierta correctamente')
    } catch (error) {
      console.error('Error al abrir turno:', error)
      mostrarMensaje('Error al abrir turno: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setProcesando(false)
    }
  }

  const handleCerrarTurno = async () => {
    if (!liquidacionCerrar?.id) return
    try {
      setProcesando(true)
      const cierreData = {
        supervisor_cierre_id: user.id,
        efectivo_sistema: parseFloat(liquidacionCerrar.efectivo_esperado || 0),
        efectivo_real: parseFloat(efectivoReal),
        observaciones_cierre: observaciones,
      }
      await cerrarTurnoDia(liquidacionCerrar.id, cierreData)
      await cargarDatos()
      setMostrarModalCerrar(false)
      setLiquidacionCerrar(null)
      setEfectivoReal('')
      setObservaciones('')
      mostrarMensaje('Liquidación de turno cerrada correctamente')
    } catch (error) {
      console.error('Error al cerrar turno:', error)
      mostrarMensaje('Error al cerrar turno: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setProcesando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Turno Día</h1>
              <p className="text-sm text-gray-600 mt-1">
                <Users className="w-4 h-4 inline mr-1" />
                {user?.nombres} {user?.apellidos} - Supervisor
              </p>
            </div>
            {configsSinLiquidacionHoy.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const first = configsSinLiquidacionHoy[0]
                  setTurnoConfigIdAbrir(first ? String(first.id) : '')
                  setMostrarModalAbrir(true)
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Abrir liquidación de turno
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mensaje */}
      {mensaje && (
        <div className={`fixed top-20 right-4 z-50 ${
          mensaje.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}>
          {mensaje.tipo === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {mensaje.texto}
        </div>
      )}

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <p className="text-sm text-gray-600">
          Cada fila es una liquidación del día según el tipo de turno (Turno 1 mañana, GLP tarde, etc.).
          Puede haber varias el mismo día si tiene configuradas varias en mantenimiento.
        </p>

        {turnosHoy.length > 0 ? (
          turnosHoy.map((turnoDia) => (
            <div key={turnoDia.id} className="card p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      turnoDia.estado_id === 1 ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    {turnoDia.estado_id === 1 ? (
                      <Unlock className="w-8 h-8 text-green-600" />
                    ) : (
                      <Lock className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {nombreTipoTurno(turnoDia.turno_config_id)}
                    </h2>
                    <p className="text-sm text-gray-500 font-mono">{turnoDia.codigo}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      {safeFormatDate(turnoDia.fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      turnoDia.estado_id === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {turnoDia.estado_id === 1 ? 'ABIERTO' : 'CERRADO'}
                  </span>
                  {turnoDia.estado_id === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLiquidacionCerrar(turnoDia)
                        setMostrarModalCerrar(true)
                      }}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Cerrar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Apertura</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Supervisor:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {turnoDia.supervisor_apertura?.nombres} {turnoDia.supervisor_apertura?.apellidos}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Hora:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {safeFormatDate(turnoDia.hora_apertura, 'HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                </div>

                {turnoDia.estado_id === 2 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Cierre</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Supervisor:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {turnoDia.supervisor_cierre?.nombres} {turnoDia.supervisor_cierre?.apellidos}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hora:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {safeFormatDate(turnoDia.hora_cierre, 'HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-primary-50 rounded-lg p-4">
                  <p className="text-sm text-primary-700 mb-1">Total Ventas</p>
                  <p className="text-2xl font-bold text-primary-900">
                    S/ {parseFloat(turnoDia.total_ventas || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-1">Total Gastos</p>
                  <p className="text-2xl font-bold text-green-900">
                    S/ {parseFloat(turnoDia.total_gastos || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-700 mb-1">Efectivo Esperado</p>
                  <p className="text-2xl font-bold text-orange-900">
                    S/ {parseFloat(turnoDia.efectivo_esperado || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {turnoDia.estado_id === 2 && (
                <div
                  className={`rounded-lg p-6 ${
                    parseFloat(turnoDia.diferencia) === 0
                      ? 'bg-green-50 border border-green-200'
                      : parseFloat(turnoDia.diferencia) < 0
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <h3 className="text-center text-xl font-bold mb-4">
                    {parseFloat(turnoDia.diferencia) === 0
                      ? '✅ Turno Cuadrado'
                      : parseFloat(turnoDia.diferencia) < 0
                        ? '❌ Turno con Faltante'
                        : '⚠️ Turno con Sobrante'}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Efectivo Sistema</p>
                      <p className="text-lg font-bold">
                        S/ {parseFloat(turnoDia.efectivo_sistema || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Efectivo Real</p>
                      <p className="text-lg font-bold">
                        S/ {parseFloat(turnoDia.efectivo_real || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Diferencia</p>
                      <p
                        className={`text-lg font-bold ${
                          parseFloat(turnoDia.diferencia) === 0
                            ? 'text-green-600'
                            : parseFloat(turnoDia.diferencia) < 0
                              ? 'text-red-600'
                              : 'text-orange-600'
                        }`}
                      >
                        S/ {Math.abs(parseFloat(turnoDia.diferencia)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {turnoDia.observaciones_cierre && (
                    <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Observaciones:</p>
                      <p className="text-sm text-gray-900">{turnoDia.observaciones_cierre}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin liquidaciones hoy</h2>
            <p className="text-gray-600 mb-6">
              Abra una liquidación por cada tipo de turno que deba operar hoy (según su configuración en
              mantenimiento).
            </p>
            {configsSinLiquidacionHoy.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const first = configsSinLiquidacionHoy[0]
                  setTurnoConfigIdAbrir(first ? String(first.id) : '')
                  setMostrarModalAbrir(true)
                }}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Abrir liquidación de turno
              </button>
            ) : (
              <p className="text-sm text-amber-700">
                No hay tipos de turno activos o ya tiene liquidación para todos. Revise en Mantenimiento →
                Turnos (configuración).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal Abrir Turno */}
      {mostrarModalAbrir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-8 max-w-md w-full m-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Unlock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Abrir liquidación de turno
              </h3>
              <p className="text-gray-600">
                Elija el tipo de turno (debe estar configurado en mantenimiento).
              </p>
            </div>

            <div className="mb-4 text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de turno *</label>
              <select
                className="input w-full"
                value={turnoConfigIdAbrir}
                onChange={(e) => setTurnoConfigIdAbrir(e.target.value)}
              >
                <option value="">— Seleccione —</option>
                {configsSinLiquidacionHoy.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Fecha:</span>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Hora:</span>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(), 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Supervisor:</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.nombres} {user?.apellidos}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalAbrir(false)}
                disabled={procesando}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbrirTurno}
                disabled={procesando || !turnoConfigIdAbrir}
                className="btn btn-primary flex-1"
              >
                {procesando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Abriendo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Turno */}
      {mostrarModalCerrar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="card p-8 max-w-md w-full m-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Cerrar Turno del Día
              </h3>
              <p className="text-gray-600">
                Ingresa el efectivo real contado en caja
              </p>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-primary-700 mb-1">Efectivo Esperado (Sistema)</p>
              <p className="text-2xl font-bold text-primary-900">
                S/ {parseFloat(liquidacionCerrar?.efectivo_esperado || 0).toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Efectivo Real Contado *
              </label>
              <input
                type="number"
                step="0.01"
                value={efectivoReal}
                onChange={(e) => setEfectivoReal(e.target.value)}
                placeholder="0.00"
                className="input w-full"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ingresa observaciones del cierre (opcional)"
                rows="3"
                className="input w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalCerrar(false)
                  setLiquidacionCerrar(null)
                  setEfectivoReal('')
                  setObservaciones('')
                }}
                disabled={procesando}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarTurno}
                disabled={procesando || !efectivoReal}
                className="btn btn-danger flex-1"
              >
                {procesando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Cerrando...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Cerrar Turno
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionTurnoDia
