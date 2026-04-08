import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Fuel, Plus, CheckCircle, AlertCircle, Clock, User,
  Calendar, DollarSign, TrendingUp, TrendingDown, Eye, Trash2
} from 'lucide-react'
import {
  getTurnoGriferoActual,
  crearTurnoGrifero,
  getTurnoDiaActual,
  crearTurnoDia,
  listarTurnosGrifero,
  listarTurnosConfigInfra,
  eliminarTurnoGriferoAbierto,
} from '../utils/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function LiquidacionGrifero() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Estados principales
  const [turnos, setTurnos] = useState([])
  const [turnoActual, setTurnoActual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [iniciandoTurno, setIniciandoTurno] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [turnosConfig, setTurnosConfig] = useState([])
  const [turnoConfigIdModal, setTurnoConfigIdModal] = useState('')
  const [fechaTurnoModal, setFechaTurnoModal] = useState(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - offset).toISOString().split('T')[0]
  })
  const [turnoAEliminar, setTurnoAEliminar] = useState(null)
  const [eliminandoTurno, setEliminandoTurno] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      try {
        const turnoData = await getTurnoGriferoActual()
        setTurnoActual(turnoData ?? null)
      } catch {
        setTurnoActual(null)
      }
      
      const esAdminOSupervisor =
        user?.rol?.nombre === 'admin' || user?.rol?.nombre === 'supervisor'
      const [turnosData, cfgs] = await Promise.all([
        listarTurnosGrifero(esAdminOSupervisor ? {} : { empleado_id: user.id }),
        listarTurnosConfigInfra({ activo: true }),
      ])
      setTurnos(turnosData)
      setTurnosConfig(Array.isArray(cfgs) ? cfgs : [])
      
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

  const abrirModalNuevoTurno = () => {
    const first = turnosConfig[0]
    setTurnoConfigIdModal(first ? String(first.id) : '')
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    setFechaTurnoModal(new Date(now.getTime() - offset).toISOString().split('T')[0])
    setMostrarModal(true)
  }

  const handleIniciarTurno = async () => {
    const cfgId = Number(turnoConfigIdModal)
    if (!cfgId) {
      mostrarMensaje('Seleccione el tipo de turno (liquidación del día)', 'error')
      return
    }
    if (!fechaTurnoModal) {
      mostrarMensaje('Seleccione la fecha del turno', 'error')
      return
    }
    try {
      setIniciandoTurno(true)

      const fechaLiquidacion = fechaTurnoModal
      let turnoDia = await getTurnoDiaActual(cfgId, fechaLiquidacion)

      if (!turnoDia?.id) {
        try {
          turnoDia = await crearTurnoDia({
            fecha: fechaLiquidacion,
            turno_config_id: cfgId,
          })
          mostrarMensaje('Liquidación del día creada para el turno seleccionado', 'success')
        } catch (createError) {
          const det = createError.response?.data?.detail
          const msg =
            typeof det === 'string'
              ? det
              : Array.isArray(det)
                ? JSON.stringify(det)
                : ''
          if (msg.includes('Ya existe')) {
            turnoDia = await getTurnoDiaActual(cfgId, fechaLiquidacion)
          } else {
            throw new Error(
              'No se pudo crear la liquidación del día: ' + (msg || createError.message)
            )
          }
        }
      }

      if (!turnoDia?.id) {
        throw new Error('No se pudo obtener o crear la liquidación del día para este tipo de turno')
      }
      
      // Crear turno del grifero (turno de liquidación del día = padre en API)
      console.log('Creando turno de grifero con turno_liquidacion_id:', turnoDia.id)
      const nuevoTurno = await crearTurnoGrifero({
        turno_liquidacion_id: turnoDia.id,
        fecha_turno: fechaLiquidacion,
        observaciones_apertura: 'Turno iniciado desde el sistema',
      })
      
      console.log('Turno de grifero creado:', nuevoTurno)
      setTurnoActual(nuevoTurno)
      setMostrarModal(false)
      mostrarMensaje('Turno iniciado correctamente')
      
      // Recargar datos y navegar
      await cargarDatos()
      navigate(`/consultar-turnos?turno=${nuevoTurno.id}`)
      
    } catch (error) {
      console.error('Error al iniciar turno:', error)
      mostrarMensaje('Error al iniciar turno: ' + (error.message || error.response?.data?.detail || 'Error desconocido'), 'error')
    } finally {
      setIniciandoTurno(false)
    }
  }

  const handleConfirmarEliminarTurno = async () => {
    if (!turnoAEliminar?.id) return
    const idEliminado = turnoAEliminar.id
    try {
      setEliminandoTurno(true)
      await eliminarTurnoGriferoAbierto(idEliminado)
      mostrarMensaje('Turno eliminado correctamente')
      setTurnoAEliminar(null)
      if (turnoActual?.id === idEliminado) {
        setTurnoActual(null)
      }
      await cargarDatos()
    } catch (error) {
      const det = error.response?.data?.detail
      const msg =
        typeof det === 'string'
          ? det
          : Array.isArray(det)
            ? det.map((e) => e.msg).join(' ')
            : error.message
      mostrarMensaje(msg || 'No se pudo eliminar el turno', 'error')
    } finally {
      setEliminandoTurno(false)
    }
  }

  const getEstadoColor = (estado_id) => {
    switch(estado_id) {
      case 1: return 'bg-green-100 text-green-800' // Abierto
      case 2: return 'bg-gray-100 text-gray-800'   // Cerrado
      case 3: return 'bg-blue-100 text-blue-800'   // Auditado
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoTexto = (estado_id) => {
    switch(estado_id) {
      case 1: return 'Abierto'
      case 2: return 'Cerrado'
      case 3: return 'Auditado'
      default: return 'Desconocido'
    }
  }

  const formatearFecha = (fecha) => {
    return format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })
  }

  const formatearSoloFecha = (valor) => {
    if (!valor) return '—'
    const s = typeof valor === 'string' ? valor.slice(0, 10) : String(valor).slice(0, 10)
    return format(new Date(`${s}T12:00:00`), "d 'de' MMMM yyyy", { locale: es })
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
              <h1 className="text-2xl font-bold text-gray-900">Mis Turnos - Liquidación</h1>
              <p className="text-sm text-gray-600 mt-1">
                <User className="w-4 h-4 inline mr-1" />
                {user?.nombres} {user?.apellidos}
              </p>
            </div>
            <div className="flex gap-3">
              {turnoActual && (
                <button
                  type="button"
                  onClick={() => navigate(`/consultar-turnos?turno=${turnoActual.id}`)}
                  className="btn btn-success flex items-center gap-2"
                >
                  <Fuel className="w-5 h-5" />
                  Ver Turno Actual
                </button>
              )}
              <button
                type="button"
                onClick={abrirModalNuevoTurno}
                disabled={turnoActual !== null || turnosConfig.length === 0}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Turno
              </button>
            </div>
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

      <div className="p-6">
        {/* Turno Actual Card */}
        {turnoActual && (
          <div className="card p-6 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Clock className="w-4 h-4 mr-1" />
                    Turno Activo
                  </span>
                  <span className="text-sm text-gray-600">{turnoActual.codigo}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Turno en Progreso
                </h3>
                <p className="text-gray-800 font-medium">
                  Fecha del turno: {formatearSoloFecha(turnoActual.fecha_turno)}
                </p>
                <p className="text-gray-600 text-sm">
                  Registro en sistema — Inicio: {formatearFecha(turnoActual.fecha_hora_inicio)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/consultar-turnos?turno=${turnoActual.id}`)}
                className="btn btn-primary flex items-center gap-2 px-6"
              >
                <Eye className="w-5 h-5" />
                Ir al Cuadre
              </button>
            </div>
          </div>
        )}

        {/* Tabla de Turnos */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Turnos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Todos tus turnos registrados en el sistema
            </p>
          </div>
          
          {turnos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fuel className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes turnos registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Inicia tu primer turno para comenzar a registrar liquidaciones
              </p>
              <button
                type="button"
                onClick={abrirModalNuevoTurno}
                disabled={turnosConfig.length === 0}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Iniciar Primer Turno
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cód. turno-config
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha del turno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grifero
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efectivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {turnos.map((turno) => (
                    <tr key={turno.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        <span className="font-mono font-medium">
                          {turno.turno_config_codigo?.trim() || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {formatearSoloFecha(turno.fecha_turno)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">
                        {turno.empleado_nombre?.trim() || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(turno.estado_id)}`}>
                          {getEstadoTexto(turno.estado_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Esperado: S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {turno.estado_id === 2 && (
                          <div className="flex items-center gap-1">
                            {parseFloat(turno.diferencia) === 0 ? (
                              <span className="text-sm font-medium text-green-600">
                                Cuadrado
                              </span>
                            ) : parseFloat(turno.diferencia) < 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-600">
                                  S/ {Math.abs(parseFloat(turno.diferencia)).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-600">
                                  S/ {parseFloat(turno.diferencia).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/consultar-turnos?turno=${turno.id}`)}
                            className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalle
                          </button>
                          {turno.estado_id === 1 && (
                            <button
                              type="button"
                              onClick={() => setTurnoAEliminar(turno)}
                              className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                              title="Eliminar turno abierto"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {turnoAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar turno abierto</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el turno <strong>{turnoAEliminar.codigo}</strong>? Se borrarán las lecturas, ventas y demás
              registros asociados. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                disabled={eliminandoTurno}
                onClick={() => setTurnoAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger flex-1 inline-flex items-center justify-center gap-2"
                disabled={eliminandoTurno}
                onClick={handleConfirmarEliminarTurno}
              >
                {eliminandoTurno ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Iniciar Turno */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-8 max-w-md w-full m-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fuel className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Iniciar Nuevo Turno
              </h3>
              <p className="text-gray-600">
                Se creará un nuevo turno de liquidación a tu nombre
              </p>
            </div>

            <div className="mb-4 text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha operativa del turno *
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={fechaTurnoModal}
                  onChange={(e) => setFechaTurnoModal(e.target.value)}
                  max="2099-12-31"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fecha del día que se está liquidando (puede ser pasada). La hora de apertura/cierre en
                  sistema será la de hoy al registrar.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de turno / liquidación del día *
                </label>
                <select
                  className="input w-full"
                  value={turnoConfigIdModal}
                  onChange={(e) => setTurnoConfigIdModal(e.target.value)}
                >
                  <option value="">— Seleccione —</option>
                  {turnosConfig.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.codigo} — {c.nombre}
                    </option>
                  ))}
                </select>
                {turnosConfig.length === 0 && (
                  <p className="text-xs text-amber-700 mt-2">
                    No hay tipos de turno activos. Configure en Mantenimiento → Turnos (configuración).
                  </p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Grifero:</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.nombres} {user?.apellidos}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Fecha operativa:</span>
                <span className="text-sm font-medium text-gray-900">
                  {fechaTurnoModal
                    ? format(new Date(`${fechaTurnoModal}T12:00:00`), "d 'de' MMMM yyyy", { locale: es })
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Registro — hora de apertura:</span>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(), 'HH:mm')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarModal(false)}
                disabled={iniciandoTurno}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleIniciarTurno}
                disabled={iniciandoTurno || !turnoConfigIdModal}
                className="btn btn-primary flex-1"
              >
                {iniciandoTurno ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Iniciando...
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
    </div>
  )
}

export default LiquidacionGrifero
