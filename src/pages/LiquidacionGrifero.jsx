import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Fuel, Plus, CheckCircle, AlertCircle, Clock, User,
  Calendar, DollarSign, TrendingUp, TrendingDown, Eye
} from 'lucide-react'
import {
  getTurnoGriferoActual,
  crearTurnoGrifero,
  getTurnoDiaActual,
  crearTurnoDia,
  listarTurnosGrifero
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

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar turno actual (si existe)
      try {
        const turnoData = await getTurnoGriferoActual()
        setTurnoActual(turnoData)
      } catch (err) {
        setTurnoActual(null)
      }
      
      // Cargar todos los turnos del grifero
      const turnosData = await listarTurnosGrifero({ empleado_id: user.id })
      setTurnos(turnosData)
      
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

  const handleIniciarTurno = async () => {
    try {
      setIniciandoTurno(true)
      
      // Primero verificar si hay turno del día
      let turnoDia
      try {
        turnoDia = await getTurnoDiaActual()
        console.log('Turno del día encontrado:', turnoDia)
      } catch (err) {
        // No hay turno del día, intentar crear uno
        console.log('No hay turno del día, creando uno nuevo...')
        try {
          const hoy = new Date().toISOString().split('T')[0]
          turnoDia = await crearTurnoDia({
            fecha: hoy,
            supervisor_apertura_id: user.id
          })
          console.log('Turno del día creado:', turnoDia)
          mostrarMensaje('Turno del día creado exitosamente', 'success')
        } catch (createError) {
          console.error('Error al crear turno del día:', createError)
          
          // Si el error es que ya existe, intentar obtenerlo de nuevo
          if (createError.response?.data?.detail?.includes('Ya existe')) {
            turnoDia = await getTurnoDiaActual()
          } else {
            throw new Error('No se pudo crear el turno del día: ' + (createError.response?.data?.detail || createError.message))
          }
        }
      }
      
      // Verificar que tenemos un turno día
      if (!turnoDia || !turnoDia.id) {
        throw new Error('No se pudo obtener o crear el turno del día')
      }
      
      // Crear turno del grifero
      console.log('Creando turno de grifero con turno_dia_id:', turnoDia.id)
      const nuevoTurno = await crearTurnoGrifero({
        turno_dia_id: turnoDia.id,
        empleado_id: user.id,
        observaciones_apertura: 'Turno iniciado desde el sistema'
      })
      
      console.log('Turno de grifero creado:', nuevoTurno)
      setTurnoActual(nuevoTurno)
      setMostrarModal(false)
      mostrarMensaje('Turno iniciado correctamente')
      
      // Recargar datos y navegar
      await cargarDatos()
      navigate(`/liquidacion/${nuevoTurno.id}`)
      
    } catch (error) {
      console.error('Error al iniciar turno:', error)
      mostrarMensaje('Error al iniciar turno: ' + (error.message || error.response?.data?.detail || 'Error desconocido'), 'error')
    } finally {
      setIniciandoTurno(false)
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
                  onClick={() => navigate(`/liquidacion/${turnoActual.id}`)}
                  className="btn btn-success flex items-center gap-2"
                >
                  <Fuel className="w-5 h-5" />
                  Ver Turno Actual
                </button>
              )}
              <button
                onClick={() => setMostrarModal(true)}
                disabled={turnoActual !== null}
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
                <p className="text-gray-600">
                  Inicio: {formatearFecha(turnoActual.fecha_hora_inicio)}
                </p>
              </div>
              <button
                onClick={() => navigate(`/liquidacion/${turnoActual.id}`)}
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
                onClick={() => setMostrarModal(true)}
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
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Inicio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Fin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duración
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {turno.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(turno.estado_id)}`}>
                          {getEstadoTexto(turno.estado_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatearFecha(turno.fecha_hora_inicio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {turno.fecha_hora_fin ? formatearFecha(turno.fecha_hora_fin) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {turno.duracion_minutos ? `${turno.duracion_minutos} min` : '-'}
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
                        <button
                          onClick={() => navigate(`/liquidacion/${turno.id}`)}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Grifero:</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.nombres} {user?.apellidos}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Fecha:</span>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Hora:</span>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(), 'HH:mm')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                disabled={iniciandoTurno}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleIniciarTurno}
                disabled={iniciandoTurno}
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
