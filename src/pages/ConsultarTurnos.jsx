import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Fuel, LogOut, Plus, Save, CheckCircle, AlertCircle,
  Gauge, ShoppingCart, CreditCard, Receipt, DollarSign, X, Pencil, Trash2,
  Percent, Search, FileText, AlertTriangle
} from 'lucide-react'
import {
  getTurnosGrifero,
  getContometros,
  getProductos,
  agregarLecturaContometro,
  actualizarLecturaContometro,
  agregarVentaProducto,
  agregarVentaPOS,
  actualizarVentaPOS,
  eliminarVentaPOS,
  agregarVale,
  agregarDeposito,
  actualizarDeposito,
  eliminarDeposito,
  agregarDescuentoTurno,
  agregarVentaGuiaCreditoTurno,
  agregarVentaGuiaRemisionTurno,
  marcarGuiaCreditoPagadoTurno,
  marcarGuiaRemisionPagadoTurno,
  actualizarVentaGuiaCreditoTurno,
  eliminarVentaGuiaCreditoTurno,
  actualizarVentaGuiaRemisionTurno,
  eliminarVentaGuiaRemisionTurno,
  cerrarTurnoGrifero,
  getTurnoById,
  getTiposVale,
  getPrefillLecturaContometro,
  getClientes,
  eliminarTurnoGriferoCerrado
} from '../utils/api'

function ConsultarTurnos() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Estados principales
  const [turnos, setTurnos] = useState([])
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [turno, setTurno] = useState(null)
  const [contometros, setContometros] = useState([])
  const [productos, setProductos] = useState([])
  const [tiposVale, setTiposVale] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [tabActiva, setTabActiva] = useState('lecturas')
  const [vistaActual, setVistaActual] = useState('lista') // 'lista' o 'detalle'

  // Estados para formularios
  const [showModalLectura, setShowModalLectura] = useState(false)
  const [showModalVenta, setShowModalVenta] = useState(false)
  const [showModalPOS, setShowModalPOS] = useState(false)
  const [showModalVale, setShowModalVale] = useState(false)
  const [showModalCierre, setShowModalCierre] = useState(false)
  const [turnoEliminarCerrado, setTurnoEliminarCerrado] = useState(null)
  const [textoConfirmarEliminarCerrado, setTextoConfirmarEliminarCerrado] = useState('')
  const [eliminandoTurnoCerrado, setEliminandoTurnoCerrado] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarListaYCatalogos = async () => {
    const turnosData = await getTurnosGrifero()
    setTurnos(turnosData)
    const [contometrosData, productosData, tiposValeData] = await Promise.all([
      getContometros(),
      getProductos(),
      getTiposVale()
    ])
    setContometros(contometrosData)
    setProductos(productosData.filter(p =>
      Number(p.categoria_id) !== 1 &&
      String(p.categoria || '').toLowerCase() !== 'combustible'
    ))
    setTiposVale(tiposValeData)
  }

  const cargarDatos = async () => {
    try {
      setLoading(true)
      await cargarListaYCatalogos()

      const tid = searchParams.get('turno')
      if (tid) {
        const nid = Number(tid)
        if (!Number.isNaN(nid)) {
          const turnoData = await getTurnoById(nid)
          setTurno(turnoData)
          setTurnoSeleccionado(nid)
          setVistaActual('detalle')
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const cargarDetalleTurno = async (turnoId) => {
    try {
      setLoading(true)
      const turnoData = await getTurnoById(turnoId)
      setTurno(turnoData)
      setTurnoSeleccionado(turnoId)
      setVistaActual('detalle')
      setSearchParams({ turno: String(turnoId) }, { replace: true })
    } catch (error) {
      console.error('Error al cargar turno:', error)
      mostrarMensaje('Error al cargar turno', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const volverALista = async () => {
    setVistaActual('lista')
    setTurno(null)
    setTurnoSeleccionado(null)
    setSearchParams({}, { replace: true })
    try {
      setLoading(true)
      await cargarListaYCatalogos()
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const recargarDatosLiquidacion = async () => {
    const idDetalle = turnoSeleccionado
    try {
      const turnosData = await getTurnosGrifero()
      setTurnos(turnosData)
      if (idDetalle) {
        const turnoData = await getTurnoById(idDetalle)
        setTurno(turnoData)
      }
    } catch (error) {
      console.error('Error al recargar:', error)
      mostrarMensaje('Error al recargar datos', 'error')
    }
  }

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 3000)
  }

  const ejecutarEliminarTurnoCerrado = async () => {
    if (!turnoEliminarCerrado?.id) return
    if (textoConfirmarEliminarCerrado.trim() !== 'CONFIRMAR') {
      mostrarMensaje('Debe escribir exactamente CONFIRMAR', 'error')
      return
    }
    const idEliminado = turnoEliminarCerrado.id
    setEliminandoTurnoCerrado(true)
    try {
      await eliminarTurnoGriferoCerrado(idEliminado, 'CONFIRMAR')
      mostrarMensaje('Turno cerrado eliminado correctamente')
      setTurnoEliminarCerrado(null)
      setTextoConfirmarEliminarCerrado('')
      const estabaEnDetalle = turnoSeleccionado === idEliminado || turno?.id === idEliminado
      if (estabaEnDetalle) {
        setTurno(null)
        setTurnoSeleccionado(null)
        setVistaActual('lista')
        setSearchParams({}, { replace: true })
      }
      setLoading(true)
      try {
        const turnosData = await getTurnosGrifero()
        setTurnos(turnosData)
      } finally {
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      mostrarMensaje('No se pudo eliminar el turno (¿permiso turno.cerrar?)', 'error')
    } finally {
      setEliminandoTurnoCerrado(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Calcular totales (alineado a la fórmula del backend para efectivo esperado)
  const calcularTotales = () => {
    if (!turno) return null

    const totalCombustible = parseFloat(turno.total_venta_combustible || 0)
    const totalProductos = parseFloat(turno.total_venta_productos || 0)
    const totalPOS = parseFloat(turno.total_ventas_pos || 0)
    const lineasGuiaCredito = turno.ventas_guia_credito ?? turno.ventas_credito ?? []
    const lineasGuiaRemision = turno.ventas_guia_remision ?? []
    const totalGuiaCredito = lineasGuiaCredito.reduce(
      (s, v) => s + parseFloat(v.monto || 0),
      0
    )
    const totalGuiaRemision = lineasGuiaRemision.reduce(
      (s, v) => s + parseFloat(v.monto || 0),
      0
    )
    const totalCredito =
      parseFloat(turno.total_ventas_credito || 0) ||
      totalGuiaCredito + totalGuiaRemision
    const totalDescuentos = parseFloat(turno.total_descuentos || 0)
    const totalVales = parseFloat(turno.total_vales || 0)
    const totalGastos = parseFloat(turno.total_gastos_autorizados || 0)
    const totalDepositos = parseFloat(turno.total_depositos_caja || 0)
    const efectivoEsperado = parseFloat(turno.efectivo_esperado || 0)
    const baseVentas = totalCombustible + totalProductos
    const efectivoCalculado =
      baseVentas -
      totalPOS -
      totalCredito -
      totalDescuentos -
      totalVales -
      totalGastos -
      totalDepositos

    return {
      totalCombustible,
      totalProductos,
      baseVentas,
      totalPOS,
      totalCredito,
      totalGuiaCredito,
      totalGuiaRemision,
      totalDescuentos,
      totalVales,
      totalGastos,
      totalDepositos,
      efectivoEsperado,
      efectivoCalculado,
      diferenciaFormula: Math.abs(efectivoCalculado - efectivoEsperado),
    }
  }

  const totales = calcularTotales()

  const modalEliminarTurnoCerradoJsx =
    turnoEliminarCerrado && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
        <div className="card p-6 max-w-lg w-full border-2 border-red-200 shadow-xl">
          <div className="flex gap-3 mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600 shrink-0" aria-hidden />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Eliminar turno cerrado</h3>
              <p className="text-sm text-gray-700 mt-2">
                Va a eliminar de forma <strong>permanente</strong> un turno que ya está{' '}
                <strong>cerrado</strong>: <strong>{turnoEliminarCerrado.codigo}</strong>. Se borrarán todos
                los datos de liquidación vinculados (lecturas, ventas, guías, depósitos, cierre, etc.). Esta
                acción <strong>no se puede deshacer</strong>.
              </p>
              <p className="text-sm font-semibold text-red-800 mt-3">
                Escriba exactamente <span className="font-mono bg-red-50 px-1 rounded">CONFIRMAR</span> para
                habilitar el botón de eliminación.
              </p>
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmación</label>
          <input
            type="text"
            className="input font-mono mb-4"
            placeholder="CONFIRMAR"
            value={textoConfirmarEliminarCerrado}
            onChange={(e) => setTextoConfirmarEliminarCerrado(e.target.value)}
            autoComplete="off"
            disabled={eliminandoTurnoCerrado}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              disabled={eliminandoTurnoCerrado}
              onClick={() => {
                setTurnoEliminarCerrado(null)
                setTextoConfirmarEliminarCerrado('')
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger flex-1"
              disabled={
                eliminandoTurnoCerrado || textoConfirmarEliminarCerrado.trim() !== 'CONFIRMAR'
              }
              onClick={ejecutarEliminarTurnoCerrado}
            >
              {eliminandoTurnoCerrado ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      </div>
    )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f3e0' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Vista de lista de turnos
  if (vistaActual === 'lista') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f5f3e0' }}>
        {/* Header */}
        <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#faf8e4' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Liquidación de Turnos</h1>
                  <p className="text-sm text-gray-600">
                    {user?.nombres} {user?.apellidos}
                  </p>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary">
                <LogOut className="w-5 h-5 mr-2" />
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* Mensaje de notificación */}
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Turnos del Día</h2>
            <p className="text-gray-600">Selecciona un turno para ver sus detalles y liquidación</p>
          </div>

          {turnos.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fuel className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay turnos registrados</h3>
              <p className="text-gray-600">No se encontraron turnos para el día de hoy</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {turnos.map(t => {
                const estadoLabel =
                  t.estado_id === 1 ? 'abierto' :
                  t.estado_id === 2 ? 'cerrado' : 'auditado'
                const estadoColor =
                  t.estado_id === 1 ? 'bg-green-100 text-green-800' :
                  t.estado_id === 2 ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                
                return (
                  <div 
                    key={t.id} 
                    className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => cargarDetalleTurno(t.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Gauge className="w-6 h-6 text-primary-600" />
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${estadoColor}`}>
                        {estadoLabel}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t.codigo}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {t.empleado?.nombres} {t.empleado?.apellidos}
                    </p>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Inicio: {new Date(t.fecha_hora_inicio).toLocaleString('es-PE')}</p>
                      {t.fecha_hora_fin && (
                        <p>Fin: {new Date(t.fecha_hora_fin).toLocaleString('es-PE')}</p>
                      )}
                    </div>
                    
                    <button type="button" className="btn btn-primary w-full mt-4">
                      Ver Detalles
                    </button>
                    {t.estado_id === 2 && (
                      <button
                        type="button"
                        className="btn btn-danger w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTurnoEliminarCerrado(t)
                          setTextoConfirmarEliminarCerrado('')
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2 inline" />
                        Eliminar turno cerrado
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {modalEliminarTurnoCerradoJsx}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f3e0' }}>
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#faf8e4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <button
                onClick={volverALista}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver a la lista"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Liquidación de Turno</h1>
                <p className="text-sm text-gray-600">
                  {turno.empleado?.nombres} {turno.empleado?.apellidos} • {turno.codigo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {turno.estado_id === 2 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setTurnoEliminarCerrado(turno)
                    setTextoConfirmarEliminarCerrado('')
                  }}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Eliminar turno cerrado
                </button>
              )}
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mensaje de notificación */}
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

      {modalEliminarTurnoCerradoJsx}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Resumen de Totales */}
        {totales && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Combustible</p>
                <p className="text-lg font-bold text-primary-600">S/ {totales.totalCombustible.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Productos</p>
                <p className="text-lg font-bold text-green-600">S/ {totales.totalProductos.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">POS</p>
                <p className="text-lg font-bold text-orange-600">S/ {totales.totalPOS.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Guía crédito</p>
                <p className="text-lg font-bold text-amber-700">S/ {totales.totalGuiaCredito.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Guía remisión</p>
                <p className="text-lg font-bold text-yellow-800">S/ {totales.totalGuiaRemision.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Descuentos</p>
                <p className="text-lg font-bold text-rose-600">S/ {totales.totalDescuentos.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Vales</p>
                <p className="text-lg font-bold text-red-600">S/ {totales.totalVales.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Gastos</p>
                <p className="text-lg font-bold text-gray-700">S/ {totales.totalGastos.toFixed(2)}</p>
              </div>
              <div className="card p-3">
                <p className="text-xs text-gray-600 mb-1">Depósitos</p>
                <p className="text-lg font-bold text-purple-600">S/ {totales.totalDepositos.toFixed(2)}</p>
              </div>
            </div>

            <div className="card p-5 mb-6 border-2 border-primary-200 bg-primary-50/40">
              <h3 className="text-sm font-bold text-primary-900 uppercase tracking-wide mb-3">
                Totalizador — efectivo esperado en caja
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Combustible + productos (venta registrada) menos lo que no queda como efectivo en caja (POS,
                guías crédito/remisión, descuentos, vales, gastos, depósitos en caja).
              </p>
              <div className="space-y-1.5 text-sm max-w-lg">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-700">Venta combustible + productos</span>
                  <span className="font-semibold tabular-nums">S/ {totales.baseVentas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-red-700">
                  <span>(−) Ventas POS (tarjeta)</span>
                  <span className="font-semibold tabular-nums">S/ {totales.totalPOS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-red-700">
                  <span>(−) Guías crédito + remisión</span>
                  <span className="font-semibold tabular-nums">S/ {totales.totalCredito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-red-700">
                  <span>(−) Descuentos aplicados</span>
                  <span className="font-semibold tabular-nums">S/ {totales.totalDescuentos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-red-700">
                  <span>(−) Vales</span>
                  <span className="font-semibold tabular-nums">S/ {totales.totalVales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-red-700">
                  <span>(−) Gastos autorizados</span>
                  <span className="font-semibold tabular-nums">S/ {totales.totalGastos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-4 text-red-700">
                  <span>(−) Depósitos en caja</span>
                  <span className="font-semibold tabular-nums">S/ {totales.totalDepositos.toFixed(2)}</span>
                </div>
                <div className="border-t border-primary-200 pt-2 mt-2 flex justify-between gap-4 text-base font-bold text-primary-900">
                  <span>= Efectivo esperado</span>
                  <span className="tabular-nums">S/ {totales.efectivoEsperado.toFixed(2)}</span>
                </div>
                {totales.diferenciaFormula >= 0.02 && (
                  <p className="text-xs text-amber-800 pt-1">
                    Comprobación manual: S/ {totales.efectivoCalculado.toFixed(2)} (diferencia redondeo o datos
                    desactualizados; recargue el turno).
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'lecturas', label: 'Lecturas Contómetro', icon: Gauge },
                { id: 'ventas', label: 'Ventas Productos', icon: ShoppingCart },
                { id: 'pos', label: 'Ventas POS', icon: CreditCard },
                { id: 'guia_credito', label: 'Guía crédito', icon: FileText },
                { id: 'guia_remision', label: 'Guía remisión', icon: FileText },
                { id: 'vales', label: 'Vales', icon: Receipt },
                { id: 'descuentos', label: 'Descuentos', icon: Percent },
                { id: 'depositos', label: 'Depósitos', icon: DollarSign },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    tabActiva === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido de Tabs */}
          <div className="p-6">
            {tabActiva === 'lecturas' && (
              <TabLecturas
                turno={turno}
                contometros={contometros}
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'ventas' && (
              <TabVentas
                turno={turno}
                productos={productos}
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'pos' && (
              <TabPOS
                turno={turno}
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'guia_credito' && (
              <TabVentasGuia
                turno={turno}
                tipo="credito"
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'guia_remision' && (
              <TabVentasGuia
                turno={turno}
                tipo="remision"
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'vales' && (
              <TabVales
                turno={turno}
                tiposVale={tiposVale}
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'descuentos' && (
              <TabDescuentos
                turno={turno}
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
            {tabActiva === 'depositos' && (
              <TabDepositos
                turno={turno}
                onReload={recargarDatosLiquidacion}
                onMensaje={mostrarMensaje}
              />
            )}
          </div>
        </div>

        {/* Botón de Cierre */}
        {turno.estado_id === 1 && totales && (
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  ¿Listo para cerrar el turno?
                </h3>
                <p className="text-gray-600">
                  Efectivo esperado: <span className="font-bold">S/ {totales.efectivoEsperado.toFixed(2)}</span>
                </p>
              </div>
              <button
                onClick={() => setShowModalCierre(true)}
                className="btn btn-success flex items-center gap-2 px-6 py-3"
              >
                <CheckCircle className="w-5 h-5" />
                Cerrar Turno
              </button>
            </div>
          </div>
        )}

        {turno.estado_id === 2 && (
          <div className={`card p-6 ${
            parseFloat(turno.diferencia || 0) === 0 ? 'bg-green-50 border-green-200' :
            parseFloat(turno.diferencia || 0) < 0 ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">
                {parseFloat(turno.diferencia || 0) === 0 ? '✅ Turno Cuadrado' :
                 parseFloat(turno.diferencia || 0) < 0 ? '❌ Turno con Faltante' :
                 '⚠️ Turno con Sobrante'}
              </h3>
              <p className="text-lg mb-4">
                Diferencia: <span className="font-bold">S/ {parseFloat(turno.diferencia || 0).toFixed(2)}</span>
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div>
                  <p className="text-sm text-gray-600">Efectivo Esperado</p>
                  <p className="text-xl font-bold">S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efectivo Entregado</p>
                  <p className="text-xl font-bold">S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cierre */}
      {showModalCierre && totales && (
        <ModalCierre
          turno={turno}
          totales={totales}
          onClose={() => setShowModalCierre(false)}
          onSuccess={() => {
            setShowModalCierre(false)
            volverALista()
            mostrarMensaje('Turno cerrado correctamente')
          }}
        />
      )}
    </div>
  )
}

// Componentes de Tabs
function TabLecturas({ turno, contometros, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [lecturaEdit, setLecturaEdit] = useState(null)
  const [lecturaEditCompleta, setLecturaEditCompleta] = useState(null)

  const handleAgregar = async (data) => {
    try {
      await agregarLecturaContometro(turno.id, {
        contometro_id: Number(data.contometro_id),
        lectura_inicial: data.lectura_inicial,
        lectura_final: data.lectura_final,
        precio_venta: data.precio_venta,
        tiene_anomalia: Boolean(data.tiene_anomalia),
        observaciones: data.observaciones || null
      })
      onMensaje('Lectura agregada correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar lectura', 'error')
    }
  }

  const handleActualizar = async (lecturaId, payload) => {
    try {
      await actualizarLecturaContometro(lecturaId, payload)
      onMensaje('Lectura actualizada correctamente')
      onReload()
      return true
    } catch (error) {
      onMensaje('Error al actualizar lectura', 'error')
      return false
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Lecturas de Contómetros</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Lectura
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.lecturas_contometro?.map(lectura => {
          const contometro = contometros.find(c => c.id === lectura.contometro_id)
          const gal = parseFloat(lectura.lectura_final) - parseFloat(lectura.lectura_inicial)
          const monto = gal * parseFloat(lectura.precio_venta)
          const pendienteFinal =
            Number(lectura.lectura_final) === Number(lectura.lectura_inicial)
          return (
            <div key={lectura.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{contometro?.codigo}</p>
                  <p className="text-sm text-gray-600">
                    Lectura Inicial: {lectura.lectura_inicial} gal
                  </p>
                  <p className="text-sm text-gray-600">
                    Lectura Final: {lectura.lectura_final} gal
                  </p>
                  <p className="text-sm font-semibold text-primary-600">
                    Total: {gal.toFixed(3)} gal × S/ {lectura.precio_venta} = S/ {monto.toFixed(2)}
                  </p>
                </div>
                {turno.estado_id === 1 && (
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      type="button"
                      onClick={() => setLecturaEditCompleta(lectura)}
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar lectura
                    </button>
                    {pendienteFinal && (
                      <button
                        type="button"
                        onClick={() => setLecturaEdit(lectura)}
                        className="btn btn-primary btn-sm"
                      >
                        Registrar Final
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <ModalLectura
          cabeceraGriferoId={turno.id}
          contometros={contometros}
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}

      {lecturaEdit && (
        <ModalLecturaFinal
          lectura={lecturaEdit}
          onClose={() => setLecturaEdit(null)}
          onSubmit={async (lecturaFinal) => {
            const ok = await handleActualizar(lecturaEdit.id, { lectura_final: lecturaFinal })
            if (ok) setLecturaEdit(null)
            return ok
          }}
        />
      )}

      {lecturaEditCompleta && (
        <ModalLecturaEditar
          lectura={lecturaEditCompleta}
          contometros={contometros}
          onClose={() => setLecturaEditCompleta(null)}
          onSubmit={async (payload) => {
            const ok = await handleActualizar(lecturaEditCompleta.id, payload)
            if (ok) setLecturaEditCompleta(null)
            return ok
          }}
        />
      )}
    </div>
  )
}

function TabVentas({ turno, productos, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)

  const handleAgregar = async (data) => {
    try {
      await agregarVentaProducto(turno.id, {
        producto_id: Number(data.producto_id),
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario
      })
      onMensaje('Venta agregada correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar venta', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ventas de Productos</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Venta
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.ventas_producto?.map(venta => {
          const producto = productos.find(p => p.id === venta.producto_id)
          const subtotal =
            parseFloat(venta.cantidad) * parseFloat(venta.precio_unitario)
          return (
            <div key={venta.id} className="card p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{producto?.nombre || venta.nombre_producto || 'Producto'}</p>
                  <p className="text-sm text-gray-600">
                    {venta.cantidad} × S/ {venta.precio_unitario} = S/ {subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <ModalVenta
          productos={productos}
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
    </div>
  )
}

function TabPOS({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [ventaPosEdicion, setVentaPosEdicion] = useState(null)
  const [posEliminar, setPosEliminar] = useState(null)

  const buildPayload = (data) => ({
    monto: parseFloat(data.monto),
    numero_operacion: String(data.numero_operacion ?? '').trim() || 'S/N',
    tipo_tarjeta: data.tipo_tarjeta,
    numero_lote: data.numero_lote || null,
    terminal_id: data.terminal_id || null,
    autorizacion: data.autorizacion || null,
  })

  const handleGuardarPOS = async (data) => {
    const editando = Boolean(ventaPosEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarVentaPOS(ventaPosEdicion.id, payload)
        onMensaje('Venta POS actualizada correctamente')
      } else {
        await agregarVentaPOS(turno.id, payload)
        onMensaje('Venta POS agregada correctamente')
      }
      setShowModal(false)
      setVentaPosEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar venta POS' : 'Error al agregar venta POS', 'error')
    }
  }

  const handleConfirmarEliminarPOS = async () => {
    if (!posEliminar?.id) return
    try {
      await eliminarVentaPOS(posEliminar.id)
      onMensaje('Venta POS eliminada correctamente')
      setPosEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar venta POS', 'error')
    }
  }

  const abrirNueva = () => {
    setVentaPosEdicion(null)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ventas con Tarjeta (POS)</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={abrirNueva} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Venta POS
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.ventas_pos?.map(venta => (
          <div key={venta.id} className="card p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-medium">S/ {venta.monto}</p>
                <p className="text-sm text-gray-600">
                  {venta.tipo_tarjeta} • Op: {venta.numero_operacion}
                </p>
                {venta.numero_lote && (
                  <p className="text-xs text-gray-500">Lote: {venta.numero_lote}</p>
                )}
              </div>
              {turno.estado_id === 1 && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setVentaPosEdicion(venta)
                      setShowModal(true)
                    }}
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosEliminar(venta)}
                    className="btn btn-danger btn-sm inline-flex items-center gap-1"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalPOS
          key={ventaPosEdicion?.id ?? 'nueva'}
          ventaInicial={ventaPosEdicion}
          onClose={() => {
            setShowModal(false)
            setVentaPosEdicion(null)
          }}
          onSubmit={handleGuardarPOS}
        />
      )}

      {posEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar venta POS</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar la operación <strong>{posEliminar.numero_operacion}</strong> por{' '}
              <strong>S/ {posEliminar.monto}</strong>? Se actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setPosEliminar(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={handleConfirmarEliminarPOS}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabVales({ turno, tiposVale, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const vales = turno.vales_caja ?? turno.vales ?? []

  const handleAgregar = async (data) => {
    try {
      await agregarVale(turno.id, {
        tipo_vale_id: Number(data.tipo_vale_id),
        monto: data.monto,
        beneficiario: data.beneficiario,
        autorizado_por: data.autorizado_por,
        numero_vale: data.numero_vale,
        observaciones: data.observaciones || null
      })
      onMensaje('Vale agregado correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar vale', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Vales</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Vale
          </button>
        )}
      </div>

      <div className="space-y-3">
        {vales.map(vale => (
          <div key={vale.id} className="card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{vale.numero_vale} — S/ {vale.monto}</p>
                <p className="text-sm text-gray-600">{vale.beneficiario}</p>
                <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                  {vale.estado}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalVale
          tiposVale={tiposVale}
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
    </div>
  )
}

function TabDepositos({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [depositoEdicion, setDepositoEdicion] = useState(null)
  const [depositoEliminar, setDepositoEliminar] = useState(null)
  const depositos = turno.depositos_caja ?? turno.depositos ?? []

  const buildPayload = (data) => ({
    monto: parseFloat(data.monto),
    recibido_por: data.recibido_por?.trim() ? data.recibido_por.trim() : null,
    numero_comprobante: data.numero_comprobante?.trim() ? data.numero_comprobante.trim() : null,
    observaciones: data.observaciones?.trim() ? data.observaciones.trim() : null,
  })

  const handleGuardarDeposito = async (data) => {
    const editando = Boolean(depositoEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarDeposito(depositoEdicion.id, payload)
        onMensaje('Depósito actualizado correctamente')
      } else {
        await agregarDeposito(turno.id, payload)
        onMensaje('Depósito agregado correctamente')
      }
      setShowModal(false)
      setDepositoEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar depósito' : 'Error al agregar depósito', 'error')
    }
  }

  const handleConfirmarEliminarDeposito = async () => {
    if (!depositoEliminar?.id) return
    try {
      await eliminarDeposito(depositoEliminar.id)
      onMensaje('Depósito eliminado correctamente')
      setDepositoEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar depósito', 'error')
    }
  }

  const abrirNuevo = () => {
    setDepositoEdicion(null)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Depósitos en Caja</h3>
          <p className="text-sm text-gray-600 mt-1">
            Se restan del efectivo esperado del turno.
          </p>
        </div>
        {turno.estado_id === 1 && (
          <button type="button" onClick={abrirNuevo} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Depósito
          </button>
        )}
      </div>

      <div className="space-y-3">
        {depositos.map(deposito => (
          <div key={deposito.id} className="card p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-medium">S/ {deposito.monto}</p>
                {deposito.numero_comprobante && (
                  <p className="text-sm text-gray-600">Comprobante: {deposito.numero_comprobante}</p>
                )}
                {deposito.observaciones && (
                  <p className="text-sm text-gray-600">{deposito.observaciones}</p>
                )}
                {deposito.recibido_por && (
                  <p className="text-xs text-gray-500">Recibido por: {deposito.recibido_por}</p>
                )}
              </div>
              {turno.estado_id === 1 && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositoEdicion(deposito)
                      setShowModal(true)
                    }}
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositoEliminar(deposito)}
                    className="btn btn-danger btn-sm inline-flex items-center gap-1"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalDeposito
          key={depositoEdicion?.id ?? 'nuevo'}
          depositoInicial={depositoEdicion}
          onClose={() => {
            setShowModal(false)
            setDepositoEdicion(null)
          }}
          onSubmit={handleGuardarDeposito}
        />
      )}

      {depositoEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar depósito</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el depósito por <strong>S/ {depositoEliminar.monto}</strong>
              {depositoEliminar.numero_comprobante
                ? <> (comprobante {depositoEliminar.numero_comprobante})</>
                : null}
              ? Se actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setDepositoEliminar(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={handleConfirmarEliminarDeposito}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalLineaGuiaTurno({ title, lineaInicial, onClose, onSubmit }) {
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSel, setClienteSel] = useState(null)
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [monto, setMonto] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    let cancelled = false
    setCargando(true)
    getClientes(true)
      .then((data) => {
        if (!cancelled) setClientesDisponibles(data || [])
      })
      .catch(() => {
        if (!cancelled) setClientesDisponibles([])
      })
      .finally(() => {
        if (!cancelled) setCargando(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!lineaInicial) {
      setBusqueda('')
      setClienteSel(null)
      setNumeroDocumento('')
      setMonto('')
      setObservaciones('')
      return
    }
    const cid = lineaInicial.cliente_id
    const cl = clientesDisponibles.find((c) => c.id === cid)
    if (cl) {
      setClienteSel(cl)
      setBusqueda(cl.razon_social || '')
    } else {
      setClienteSel(null)
      setBusqueda(cid ? `Cliente #${cid}` : '')
    }
    setNumeroDocumento(lineaInicial.numero_documento ?? '')
    setMonto(lineaInicial.monto != null ? String(lineaInicial.monto) : '')
    setObservaciones(lineaInicial.observaciones ?? '')
  }, [lineaInicial, clientesDisponibles])

  const resultados = (() => {
    if (busqueda.trim() === '') return clientesDisponibles.slice(0, 60)
    const q = busqueda.toLowerCase()
    return clientesDisponibles
      .filter(
        (c) =>
          c.razon_social?.toLowerCase().includes(q) ||
          String(c.numero_documento || '').toLowerCase().includes(q)
      )
      .slice(0, 60)
  })()

  const seleccionarCliente = (c) => {
    setClienteSel(c)
    setBusqueda(c.razon_social || '')
    setMostrandoResultados(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const m = parseFloat(monto)
    if (Number.isNaN(m) || m <= 0) return
    onSubmit({
      cliente_id: clienteSel?.id ?? null,
      monto: m,
      numero_documento: numeroDocumento.trim() || null,
      fecha_vencimiento: null,
      pagado: false,
      observaciones: observaciones.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              Cliente <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className="input pr-9"
                placeholder="Buscar por razón social o documento…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  if (!e.target.value) setClienteSel(null)
                }}
                onFocus={() => setMostrandoResultados(true)}
                onBlur={() => setTimeout(() => setMostrandoResultados(false), 200)}
                disabled={cargando}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {mostrandoResultados && resultados.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => seleccionarCliente(c)}
                  >
                    <span className="font-medium">{c.razon_social}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {c.tipo_documento} {c.numero_documento}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {cargando && <p className="text-xs text-gray-500 mt-1">Cargando clientes…</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Monto (S/) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">N° documento (opcional)</label>
            <input
              type="text"
              className="input"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea className="input min-h-[72px]" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {lineaInicial ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TabVentasGuia({ turno, tipo, onReload, onMensaje }) {
  const esCredito = tipo === 'credito'
  const [showModal, setShowModal] = useState(false)
  const [lineaEdicion, setLineaEdicion] = useState(null)
  const [lineaEliminar, setLineaEliminar] = useState(null)
  const [clientesPorId, setClientesPorId] = useState({})

  const lineas = esCredito
    ? (turno.ventas_guia_credito ?? turno.ventas_credito ?? [])
    : (turno.ventas_guia_remision ?? [])

  const titulo = esCredito ? 'Guía de crédito' : 'Guía de remisión'
  const tituloModal = esCredito ? 'Nueva venta con guía de crédito' : 'Nueva venta con guía de remisión'

  useEffect(() => {
    let cancelled = false
    getClientes(true)
      .then((list) => {
        if (cancelled || !list) return
        const m = {}
        list.forEach((cl) => {
          m[cl.id] = cl
        })
        setClientesPorId(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const nombreCliente = (id) => {
    if (id == null) return '—'
    const cl = clientesPorId[id]
    return cl ? cl.razon_social : `Cliente #${id}`
  }

  const buildUpdateBody = (payload) => ({
    cliente_id: payload.cliente_id,
    monto: payload.monto,
    numero_documento: payload.numero_documento,
    fecha_vencimiento: payload.fecha_vencimiento,
    observaciones: payload.observaciones,
  })

  const handleGuardarModal = async (payload) => {
    try {
      if (lineaEdicion) {
        const body = buildUpdateBody(payload)
        if (esCredito) await actualizarVentaGuiaCreditoTurno(lineaEdicion.id, body)
        else await actualizarVentaGuiaRemisionTurno(lineaEdicion.id, body)
        onMensaje(`${titulo}: registro actualizado`)
      } else {
        if (esCredito) await agregarVentaGuiaCreditoTurno(turno.id, payload)
        else await agregarVentaGuiaRemisionTurno(turno.id, payload)
        onMensaje(`${titulo}: registro agregado`)
      }
      setShowModal(false)
      setLineaEdicion(null)
      onReload()
    } catch (error) {
      console.error(error)
      onMensaje(lineaEdicion ? 'Error al actualizar la línea' : 'Error al registrar la línea', 'error')
    }
  }

  const handleConfirmarEliminar = async () => {
    if (!lineaEliminar?.id) return
    try {
      if (esCredito) await eliminarVentaGuiaCreditoTurno(lineaEliminar.id)
      else await eliminarVentaGuiaRemisionTurno(lineaEliminar.id)
      onMensaje('Registro eliminado')
      setLineaEliminar(null)
      onReload()
    } catch (error) {
      console.error(error)
      onMensaje('Error al eliminar', 'error')
    }
  }

  const abrirNuevaLinea = () => {
    setLineaEdicion(null)
    setShowModal(true)
  }

  const handleMarcarPagado = async (linea) => {
    try {
      if (esCredito) await marcarGuiaCreditoPagadoTurno(linea.id)
      else await marcarGuiaRemisionPagadoTurno(linea.id)
      onMensaje('Marcado como pagado')
      onReload()
    } catch (error) {
      console.error(error)
      onMensaje('Error al actualizar', 'error')
    }
  }

  const pagadoFlag = (linea) => Boolean(linea.pagado)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Ventas registradas con {esCredito ? 'guía de crédito' : 'guía de remisión'} en este turno.
          </p>
        </div>
        {turno.estado_id === 1 && (
          <button type="button" onClick={abrirNuevaLinea} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </button>
        )}
      </div>

      {lineas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No hay registros en esta categoría.</p>
      ) : (
        <div className="space-y-3">
          {lineas.map((linea) => (
            <div key={linea.id} className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium">{nombreCliente(linea.cliente_id)}</p>
                  <p className="text-sm text-gray-700 mt-1">S/ {parseFloat(linea.monto || 0).toFixed(2)}</p>
                  {linea.numero_documento ? (
                    <p className="text-xs text-gray-500">Doc. {linea.numero_documento}</p>
                  ) : null}
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                      pagadoFlag(linea) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pagadoFlag(linea) ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
                {turno.estado_id === 1 && (
                  <div className="flex flex-wrap gap-2 justify-end shrink-0">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                      title="Editar"
                      onClick={() => {
                        setLineaEdicion(linea)
                        setShowModal(true)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm inline-flex items-center gap-1"
                      title="Eliminar"
                      onClick={() => setLineaEliminar(linea)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!pagadoFlag(linea) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm shrink-0"
                        onClick={() => handleMarcarPagado(linea)}
                      >
                        Marcar pagado
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalLineaGuiaTurno
          key={lineaEdicion?.id ?? 'nueva'}
          title={lineaEdicion ? `Editar — ${titulo}` : tituloModal}
          lineaInicial={lineaEdicion}
          onClose={() => {
            setShowModal(false)
            setLineaEdicion(null)
          }}
          onSubmit={handleGuardarModal}
        />
      )}

      {lineaEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar línea</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el registro por <strong>S/ {parseFloat(lineaEliminar.monto || 0).toFixed(2)}</strong>
              {lineaEliminar.numero_documento ? <> (doc. {lineaEliminar.numero_documento})</> : null}? Se
              actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setLineaEliminar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={handleConfirmarEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabDescuentos({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [clientesPorId, setClientesPorId] = useState({})
  const descuentos = turno.descuentos_aplicados ?? []

  useEffect(() => {
    let cancelled = false
    getClientes(true)
      .then((list) => {
        if (cancelled || !list) return
        const m = {}
        list.forEach((cl) => {
          m[cl.id] = cl
        })
        setClientesPorId(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const nombreCliente = (id) => {
    if (id == null) return '—'
    const cl = clientesPorId[id]
    return cl ? cl.razon_social : `Cliente #${id}`
  }

  const handleAgregar = async (payload) => {
    try {
      await agregarDescuentoTurno(turno.id, payload)
      onMensaje('Descuento aplicado registrado correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al registrar descuento', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Descuentos aplicados</h3>
          <p className="text-sm text-gray-600 mt-1">
            Se guardan en el turno de grifero y reducen el efectivo esperado según monto de descuento.
          </p>
        </div>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo descuento
          </button>
        )}
      </div>

      <div className="space-y-3">
        {descuentos.map((d) => {
          const mv = parseFloat(d.monto_venta || 0)
          const pct = parseFloat(d.porcentaje_descuento || 0)
          const montoDesc = (mv * pct) / 100
          const esSoloMontoRegistrado = pct >= 99.99 && pct <= 100.01
          return (
            <div key={d.id} className="card p-4">
              <p className="font-medium">{nombreCliente(d.cliente_id)}</p>
              {d.motivo ? (
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="text-gray-500">Doc. ref.:</span> {d.motivo}
                </p>
              ) : null}
              {esSoloMontoRegistrado ? (
                <p className="text-sm text-gray-700 mt-1">
                  Descuento{' '}
                  <span className="font-semibold text-red-600">S/ {montoDesc.toFixed(2)}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  Venta S/ {mv.toFixed(2)} · {pct}% → Descuento{' '}
                  <span className="font-semibold text-red-600">S/ {montoDesc.toFixed(2)}</span>
                </p>
              )}
            </div>
          )
        })}
        {descuentos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay descuentos en este turno.</p>
        )}
      </div>

      {showModal && (
        <ModalDescuentoTurno
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
    </div>
  )
}

function ModalDescuentoTurno({ onClose, onSubmit }) {
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSel, setClienteSel] = useState(null)
  const [numeroDocumentoReferencia, setNumeroDocumentoReferencia] = useState('')
  const [montoDescuento, setMontoDescuento] = useState('')

  useEffect(() => {
    let cancelled = false
    setCargando(true)
    getClientes(true)
      .then((data) => {
        if (!cancelled) setClientesDisponibles(data || [])
      })
      .catch(() => {
        if (!cancelled) setClientesDisponibles([])
      })
      .finally(() => {
        if (!cancelled) setCargando(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const resultados = (() => {
    if (busqueda.trim() === '') return clientesDisponibles.slice(0, 60)
    const q = busqueda.toLowerCase()
    return clientesDisponibles
      .filter(
        (c) =>
          c.razon_social?.toLowerCase().includes(q) ||
          String(c.numero_documento || '').toLowerCase().includes(q)
      )
      .slice(0, 60)
  })()

  const seleccionarCliente = (c) => {
    setClienteSel(c)
    setBusqueda(c.razon_social || '')
    setMostrandoResultados(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const md = parseFloat(montoDescuento)
    if (Number.isNaN(md) || md <= 0) return
    const ref = (numeroDocumentoReferencia || '').trim()
    // La tabla del turno exige monto_venta y %; guardamos el monto ingresado como venta al 100 % para que el descuento calculado coincida con el monto.
    onSubmit({
      cliente_id: clienteSel?.id ?? null,
      monto_venta: md,
      porcentaje_descuento: 100,
      motivo: ref || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Nuevo descuento (turno grifero)</h3>
            <p className="text-xs text-gray-500 mt-1">
              Solo el monto de descuento es obligatorio. Cliente y documento de referencia son opcionales.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              N° documento de referencia <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ej. factura, nota de crédito…"
              value={numeroDocumentoReferencia}
              onChange={(e) => setNumeroDocumentoReferencia(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              Cliente <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className="input pr-9"
                placeholder="Buscar por razón social o documento…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  if (!e.target.value) setClienteSel(null)
                }}
                onFocus={() => setMostrandoResultados(true)}
                onBlur={() => setTimeout(() => setMostrandoResultados(false), 200)}
                disabled={cargando}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {mostrandoResultados && resultados.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => seleccionarCliente(c)}
                  >
                    <span className="font-medium">{c.razon_social}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {c.tipo_documento} {c.numero_documento}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {cargando && <p className="text-xs text-gray-500 mt-1">Cargando clientes…</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Monto descuento (S/) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input font-semibold text-red-700"
              value={montoDescuento}
              onChange={(e) => setMontoDescuento(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
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

function ModalLectura({ cabeceraGriferoId, contometros, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    contometro_id: '',
    lectura_inicial: '',
    lectura_final: '',
    precio_venta: '',
    tiene_anomalia: false,
    observaciones: ''
  })
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [productoNombre, setProductoNombre] = useState('')

  useEffect(() => {
    const cid = formData.contometro_id
    if (!cid || !cabeceraGriferoId) {
      setProductoNombre('')
      return undefined
    }
    let cancelled = false
    setPrefillLoading(true)
    getPrefillLecturaContometro(cabeceraGriferoId, cid)
      .then((data) => {
        if (cancelled) return
        const raw = data.lectura_inicial_desde_cuadre_anterior
        const s =
          raw !== undefined && raw !== null && raw !== '' ? String(raw) : '0'
        setFormData((prev) => ({
          ...prev,
          contometro_id: cid,
          lectura_inicial: s,
          lectura_final: s,
          precio_venta:
            data.precio_venta !== undefined && data.precio_venta !== null
              ? String(data.precio_venta)
              : '',
        }))
        setProductoNombre(data.producto_nombre || '')
      })
      .catch(() => {
        if (cancelled) return
        setFormData((prev) => ({
          ...prev,
          contometro_id: cid,
          lectura_inicial: '0',
          lectura_final: '0',
          precio_venta: '',
        }))
        setProductoNombre('')
      })
      .finally(() => {
        if (!cancelled) setPrefillLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [formData.contometro_id, cabeceraGriferoId])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const puedeGuardar =
    !prefillLoading &&
    formData.contometro_id &&
    formData.precio_venta !== '' &&
    formData.lectura_inicial !== '' &&
    formData.lectura_final !== ''

  const iniNum = parseFloat(formData.lectura_inicial)
  const finNum = parseFloat(formData.lectura_final)
  const precioNum = parseFloat(formData.precio_venta)
  const resumenValido =
    !Number.isNaN(iniNum) &&
    !Number.isNaN(finNum) &&
    !Number.isNaN(precioNum)
  const diferenciaGal = resumenValido ? finNum - iniNum : null
  const totalSoles =
    resumenValido && diferenciaGal !== null ? diferenciaGal * precioNum : null
  const diferenciaGalFmt =
    diferenciaGal !== null ? Number(diferenciaGal.toFixed(2)) : null
  const totalSolesFmt = totalSoles !== null ? Number(totalSoles.toFixed(2)) : null

  const lecturasEditables = Boolean(formData.contometro_id) && !prefillLoading

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nueva Lectura de Contómetro</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Contómetro</label>
            <select
              className="input"
              value={formData.contometro_id}
              onChange={e =>
                setFormData(prev => ({ ...prev, contometro_id: e.target.value }))
              }
              required
            >
              <option value="">Seleccione...</option>
              {contometros.map(c => (
                <option key={c.id} value={c.id}>{c.codigo}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Primero elija el contómetro. La lectura inicial sugerida es la{' '}
              <strong>lectura final del último turno cerrado</strong> para ese equipo; si no hay historial,{' '}
              <strong>0</strong>.
            </p>
          </div>

          {!formData.contometro_id && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Seleccione el tipo de contómetro para habilitar las lecturas inicial y final.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Lectura final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input disabled:opacity-60"
              value={formData.lectura_final}
              onChange={e =>
                setFormData({
                  ...formData,
                  lectura_final: e.target.value,
                })
              }
              required
              disabled={!lecturasEditables}
              placeholder={lecturasEditables ? '' : 'Seleccione contómetro…'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Puede igualar la inicial y completar el final después con &quot;Registrar Final&quot;.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lectura inicial (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input disabled:opacity-60"
              value={formData.lectura_inicial}
              onChange={e =>
                setFormData({
                  ...formData,
                  lectura_inicial: e.target.value,
                })
              }
              required
              disabled={!lecturasEditables}
              placeholder={lecturasEditables ? '' : 'Seleccione contómetro…'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Precio de venta (solo lectura)</label>
            <input
              type="text"
              readOnly
              className="input bg-gray-50 text-gray-800 cursor-not-allowed"
              value={
                !formData.contometro_id
                  ? 'Seleccione contómetro…'
                  : formData.precio_venta !== ''
                    ? `S/ ${Number(formData.precio_venta).toFixed(2)}${productoNombre ? ` · ${productoNombre}` : ''}`
                    : prefillLoading
                      ? 'Cargando…'
                      : '—'
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Tomado del producto/combustible en mantenimiento; el servidor valida el mismo valor al guardar.
            </p>
          </div>

          {resumenValido && diferenciaGalFmt !== null && totalSolesFmt !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-800">Resumen</p>
              <p className="text-sm text-slate-700">
                Diferencia (lectura final − inicial):{' '}
                <strong>{diferenciaGalFmt.toFixed(2)} gal</strong>
              </p>
              <p className="text-sm text-slate-700">
                × Precio combustible: <strong>S/ {precioNum.toFixed(2)}</strong>
              </p>
              <p className="text-base font-bold text-primary-800 pt-2 border-t border-slate-200">
                Total venta combustible: S/ {totalSolesFmt.toFixed(2)}
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.tiene_anomalia}
              onChange={e =>
                setFormData({ ...formData, tiene_anomalia: e.target.checked })
              }
            />
            Hay anomalía en el contómetro
          </label>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              className="input min-h-[72px]"
              value={formData.observaciones}
              onChange={e =>
                setFormData({ ...formData, observaciones: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={!puedeGuardar}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalLecturaEditar({ lectura, contometros, onClose, onSubmit }) {
  const contometro = contometros.find((c) => c.id === lectura.contometro_id)
  const [lecturaInicial, setLecturaInicial] = useState(String(lectura.lectura_inicial ?? ''))
  const [lecturaFinal, setLecturaFinal] = useState(String(lectura.lectura_final ?? ''))
  const [tieneAnomalia, setTieneAnomalia] = useState(Boolean(lectura.tiene_anomalia))
  const [observaciones, setObservaciones] = useState(lectura.observaciones ?? '')

  const precio = parseFloat(lectura.precio_venta)
  const iniNum = parseFloat(lecturaInicial)
  const finNum = parseFloat(lecturaFinal)
  const resumenValido =
    !Number.isNaN(iniNum) && !Number.isNaN(finNum) && !Number.isNaN(precio)
  const diferenciaGal = resumenValido ? finNum - iniNum : null
  const totalSoles =
    resumenValido && diferenciaGal !== null ? diferenciaGal * precio : null
  const guardarValido =
    resumenValido && finNum >= iniNum && lecturaInicial !== '' && lecturaFinal !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!guardarValido) return
    const ok = await onSubmit({
      lectura_inicial: iniNum,
      lectura_final: finNum,
      tiene_anomalia: tieneAnomalia,
      observaciones: observaciones.trim() ? observaciones.trim() : null,
    })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Editar lectura de contómetro</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          <span className="font-medium text-gray-900">{contometro?.codigo || 'Contómetro'}</span>
          {' · '}
          Precio vigente al registrar: <strong>S/ {parseFloat(lectura.precio_venta).toFixed(2)}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Lectura final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={lecturaFinal}
              onChange={(e) => setLecturaFinal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lectura inicial (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={lecturaInicial}
              onChange={(e) => setLecturaInicial(e.target.value)}
              required
            />
          </div>

          {resumenValido && diferenciaGal !== null && totalSoles !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-800">Resumen</p>
              <p className="text-sm text-slate-700">
                Diferencia (final − inicial): <strong>{diferenciaGal.toFixed(2)} gal</strong>
              </p>
              <p className="text-sm text-slate-700">
                × Precio: <strong>S/ {precio.toFixed(2)}</strong>
              </p>
              <p className="text-base font-bold text-primary-800 pt-2 border-t border-slate-200">
                Total venta combustible: S/ {totalSoles.toFixed(2)}
              </p>
              {finNum < iniNum && (
                <p className="text-sm text-red-600">La lectura final no puede ser menor que la inicial.</p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tieneAnomalia}
              onChange={(e) => setTieneAnomalia(e.target.checked)}
            />
            Hay anomalía en el contómetro
          </label>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              className="input min-h-[72px]"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!guardarValido}>
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalLecturaFinal({ lectura, onClose, onSubmit }) {
  const [lecturaFinal, setLecturaFinal] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = parseFloat(lecturaFinal)
    const ok = await onSubmit(v)
    if (ok) onClose()
  }

  const fin = parseFloat(lecturaFinal)
  const ini = parseFloat(lectura.lectura_inicial)
  const precio = parseFloat(lectura.precio_venta)
  const muestraResumen =
    lecturaFinal !== '' && !Number.isNaN(fin) && !Number.isNaN(ini) && !Number.isNaN(precio)
  const diferenciaGal = muestraResumen ? fin - ini : null
  const totalSoles =
    muestraResumen && diferenciaGal !== null ? diferenciaGal * precio : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Registrar Lectura Final</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Lectura final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={lecturaFinal}
              onChange={(e) => setLecturaFinal(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Lectura inicial (referencia)</p>
            <p className="text-xl font-bold">
              {(() => {
                const x = parseFloat(lectura.lectura_inicial)
                return `${Number.isNaN(x) ? lectura.lectura_inicial : x.toFixed(2)} gal`
              })()}
            </p>
          </div>

          {muestraResumen && diferenciaGal !== null && totalSoles !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-800">Resumen</p>
              <p className="text-sm text-slate-700">
                Diferencia (final − inicial): <strong>{diferenciaGal.toFixed(2)} gal</strong>
              </p>
              <p className="text-sm text-slate-700">
                × Precio combustible: <strong>S/ {precio.toFixed(2)}</strong>
              </p>
              <p className="text-base font-bold text-primary-800 pt-2 border-t border-slate-200">
                Total venta combustible: S/ {totalSoles.toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
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

function ModalVenta({ productos, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    producto_id: '',
    cantidad: '',
    precio_unitario: ''
  })

  const total = formData.cantidad && formData.precio_unitario ? 
    parseFloat(formData.cantidad) * parseFloat(formData.precio_unitario) : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nueva Venta de Producto</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Producto</label>
            <select
              className="input"
              value={formData.producto_id}
              onChange={e => {
                const prod = productos.find(p => p.id == e.target.value)
                setFormData({
                  ...formData,
                  producto_id: e.target.value,
                  precio_unitario: prod?.precio_venta || ''
                })
              }}
              required
            >
              <option value="">Seleccione...</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio_venta}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Cantidad</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.cantidad}
              onChange={e => setFormData({...formData, cantidad: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Precio Unitario</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.precio_unitario}
              onChange={e => setFormData({...formData, precio_unitario: e.target.value})}
              required
            />
          </div>
          
          {total > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">Total</p>
              <p className="text-2xl font-bold text-green-900">S/ {total.toFixed(2)}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
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

function ModalPOS({ onClose, onSubmit, ventaInicial = null }) {
  const [formData, setFormData] = useState({
    monto: '',
    numero_operacion: '',
    tipo_tarjeta: 'credito',
    numero_lote: '',
    terminal_id: '',
    autorizacion: '',
  })

  useEffect(() => {
    if (ventaInicial) {
      setFormData({
        monto: ventaInicial.monto != null ? String(ventaInicial.monto) : '',
        numero_operacion: ventaInicial.numero_operacion ?? '',
        tipo_tarjeta: ventaInicial.tipo_tarjeta ?? 'credito',
        numero_lote: ventaInicial.numero_lote ?? '',
        terminal_id: ventaInicial.terminal_id ?? '',
        autorizacion: ventaInicial.autorizacion ?? '',
      })
    } else {
      setFormData({
        monto: '',
        numero_operacion: '',
        tipo_tarjeta: 'credito',
        numero_lote: '',
        terminal_id: '',
        autorizacion: '',
      })
    }
  }, [ventaInicial])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const titulo = ventaInicial ? 'Editar venta POS' : 'Nueva venta POS'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Monto</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Número de operación (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.numero_operacion}
              onChange={e => setFormData({...formData, numero_operacion: e.target.value})}
              placeholder="Si no aplica, se guarda como S/N"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de tarjeta</label>
            <select
              className="input"
              value={formData.tipo_tarjeta}
              onChange={e => setFormData({...formData, tipo_tarjeta: e.target.value})}
            >
              <option value="credito">Crédito</option>
              <option value="debito">Débito</option>
              <option value="prepagada">Prepagada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Número de lote (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.numero_lote}
              onChange={e => setFormData({...formData, numero_lote: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Terminal ID (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.terminal_id}
              onChange={e => setFormData({...formData, terminal_id: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Autorización (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.autorizacion}
              onChange={e => setFormData({...formData, autorizacion: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {ventaInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalVale({ tiposVale = [], onClose, onSubmit }) {
  const firstTipoId = tiposVale[0]?.id != null ? String(tiposVale[0].id) : ''
  const [formData, setFormData] = useState({
    tipo_vale_id: firstTipoId,
    numero_vale: '',
    monto: '',
    observaciones: '',
    beneficiario: '',
    autorizado_por: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nuevo Vale</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!tiposVale.length && (
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
              No hay tipos de vale en catálogo. Cargue tipos en mantenimiento o ejecute el seed de catálogos.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de vale</label>
            <select
              className="input"
              value={formData.tipo_vale_id}
              onChange={e => setFormData({...formData, tipo_vale_id: e.target.value})}
              required
              disabled={!tiposVale.length}
            >
              <option value="">Seleccione...</option>
              {tiposVale.map(t => (
                <option key={t.id} value={t.id}>{t.nombre || t.codigo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Número de Vale</label>
            <input
              type="text"
              className="input"
              value={formData.numero_vale}
              onChange={e => setFormData({...formData, numero_vale: e.target.value})}
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Monto</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Beneficiario</label>
            <input
              type="text"
              className="input"
              value={formData.beneficiario}
              onChange={e => setFormData({...formData, beneficiario: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Autorizado por</label>
            <input
              type="text"
              className="input"
              value={formData.autorizado_por}
              onChange={e => setFormData({...formData, autorizado_por: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea
              className="input min-h-[72px]"
              value={formData.observaciones}
              onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
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

function ModalDeposito({ onClose, onSubmit, depositoInicial = null }) {
  const [formData, setFormData] = useState({
    monto: '',
    observaciones: '',
    numero_comprobante: '',
    recibido_por: ''
  })

  useEffect(() => {
    if (depositoInicial) {
      setFormData({
        monto: depositoInicial.monto != null ? String(depositoInicial.monto) : '',
        observaciones: depositoInicial.observaciones ?? '',
        numero_comprobante: depositoInicial.numero_comprobante ?? '',
        recibido_por: depositoInicial.recibido_por ?? '',
      })
    } else {
      setFormData({
        monto: '',
        observaciones: '',
        numero_comprobante: '',
        recibido_por: '',
      })
    }
  }, [depositoInicial])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const titulo = depositoInicial ? 'Editar depósito' : 'Nuevo depósito'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Monto</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea
              className="input min-h-[72px]"
              value={formData.observaciones}
              onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Número de comprobante (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.numero_comprobante}
              onChange={e => setFormData({...formData, numero_comprobante: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Recibido por (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.recibido_por}
              onChange={e => setFormData({...formData, recibido_por: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {depositoInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCierre({ turno, totales, onClose, onSuccess }) {
  const [efectivoEntregado, setEfectivoEntregado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  const diferencia = efectivoEntregado ? 
    parseFloat(efectivoEntregado) - totales.efectivoEsperado : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await cerrarTurnoGrifero(turno.id, {
        efectivo_entregado: parseFloat(efectivoEntregado),
        observaciones
      })
      onSuccess()
    } catch (error) {
      console.error('Error al cerrar turno:', error)
      alert('Error al cerrar turno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Cerrar Turno</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Resumen */}
        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Venta Combustible:</span>
            <span className="font-semibold">S/ {totales.totalCombustible.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Venta Productos:</span>
            <span className="font-semibold">S/ {totales.totalProductos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Ventas POS:</span>
            <span className="font-semibold">S/ {totales.totalPOS.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Ventas a crédito:</span>
            <span className="font-semibold">S/ {totales.totalCredito.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Descuentos aplicados:</span>
            <span className="font-semibold">S/ {totales.totalDescuentos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Vales:</span>
            <span className="font-semibold">S/ {totales.totalVales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Gastos autorizados:</span>
            <span className="font-semibold">S/ {totales.totalGastos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Depósitos en caja:</span>
            <span className="font-semibold">S/ {totales.totalDepositos.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-bold text-primary-600">
            <span>Efectivo Esperado:</span>
            <span>S/ {totales.efectivoEsperado.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Efectivo Entregado</label>
            <input
              type="number"
              step="0.01"
              className="input text-lg font-semibold"
              value={efectivoEntregado}
              onChange={e => setEfectivoEntregado(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          
          {efectivoEntregado && (
            <div className={`p-4 rounded-lg ${
              diferencia === 0 ? 'bg-green-50 text-green-900' :
              diferencia < 0 ? 'bg-red-50 text-red-900' :
              'bg-yellow-50 text-yellow-900'
            }`}>
              <p className="text-sm mb-1">Diferencia</p>
              <p className="text-3xl font-bold">
                {diferencia >= 0 ? '+' : ''}S/ {diferencia.toFixed(2)}
              </p>
              <p className="text-sm mt-2">
                {diferencia === 0 ? '✅ Cuadrado' :
                 diferencia < 0 ? '❌ Faltante' :
                 '⚠️ Sobrante'}
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              className="input"
              rows="3"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              disabled={loading}
              placeholder="Opcional"
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-success flex-1"
              disabled={loading}
            >
              {loading ? 'Cerrando...' : 'Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConsultarTurnos
