import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Fuel, LogOut, Plus, Save, CheckCircle, AlertCircle,
  Gauge, ShoppingCart, CreditCard, Receipt, DollarSign, X
} from 'lucide-react'
import {
  getTurnosGrifero,
  getContometros,
  getProductos,
  agregarLecturaContometro,
  actualizarLecturaFinal,
  agregarVentaProducto,
  agregarVentaPOS,
  agregarVale,
  agregarDeposito,
  cerrarTurnoGrifero,
  getTurnoById,
  getTiposVale,
  getPrefillLecturaContometro
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
  const [showModalDeposito, setShowModalDeposito] = useState(false)
  const [showModalCierre, setShowModalCierre] = useState(false)

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


  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Calcular totales
  const calcularTotales = () => {
    if (!turno) return null

    return {
      totalCombustible: parseFloat(turno.total_venta_combustible || 0),
      totalProductos: parseFloat(turno.total_venta_productos || 0),
      totalPOS: parseFloat(turno.total_ventas_pos || 0),
      totalVales: parseFloat(turno.total_vales || 0),
      totalDepositos: parseFloat(turno.total_depositos_caja || 0),
      efectivoEsperado: parseFloat(turno.efectivo_esperado || 0)
    }
  }

  const totales = calcularTotales()

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
                    
                    <button className="btn btn-primary w-full mt-4">
                      Ver Detalles
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f3e0' }}>
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#faf8e4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
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
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
            >
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
        {/* Resumen de Totales */}
        {totales && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Combustible</p>
              <p className="text-2xl font-bold text-primary-600">
                S/ {totales.totalCombustible.toFixed(2)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Productos</p>
              <p className="text-2xl font-bold text-green-600">
                S/ {totales.totalProductos.toFixed(2)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Ventas POS</p>
              <p className="text-2xl font-bold text-orange-600">
                S/ {totales.totalPOS.toFixed(2)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Vales</p>
              <p className="text-2xl font-bold text-red-600">
                S/ {totales.totalVales.toFixed(2)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Depósitos</p>
              <p className="text-2xl font-bold text-purple-600">
                S/ {totales.totalDepositos.toFixed(2)}
              </p>
            </div>
            <div className="card p-4 bg-primary-50">
              <p className="text-sm text-primary-700 mb-1 font-medium">Efectivo Esperado</p>
              <p className="text-2xl font-bold text-primary-900">
                S/ {totales.efectivoEsperado.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'lecturas', label: 'Lecturas Contómetro', icon: Gauge },
                { id: 'ventas', label: 'Ventas Productos', icon: ShoppingCart },
                { id: 'pos', label: 'Ventas POS', icon: CreditCard },
                { id: 'vales', label: 'Vales', icon: Receipt },
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
            {tabActiva === 'vales' && (
              <TabVales
                turno={turno}
                tiposVale={tiposVale}
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

  const handleActualizar = async (lecturaId, lecturaFinal) => {
    try {
      await actualizarLecturaFinal(lecturaId, { lectura_final: lecturaFinal })
      onMensaje('Lectura actualizada correctamente')
      onReload()
    } catch (error) {
      onMensaje('Error al actualizar lectura', 'error')
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
                {turno.estado_id === 1 && pendienteFinal && (
                  <button
                    type="button"
                    onClick={() => setLecturaEdit(lectura)}
                    className="btn btn-primary btn-sm"
                  >
                    Registrar Final
                  </button>
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
          onSubmit={(lecturaFinal) => {
            handleActualizar(lecturaEdit.id, lecturaFinal)
            setLecturaEdit(null)
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

  const handleAgregar = async (data) => {
    try {
      await agregarVentaPOS(turno.id, {
        monto: data.monto,
        numero_operacion: data.numero_operacion,
        tipo_tarjeta: data.tipo_tarjeta,
        numero_lote: data.numero_lote || null,
        terminal_id: data.terminal_id || null,
        autorizacion: data.autorizacion || null
      })
      onMensaje('Venta POS agregada correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar venta POS', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ventas con Tarjeta (POS)</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Venta POS
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.ventas_pos?.map(venta => (
          <div key={venta.id} className="card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">S/ {venta.monto}</p>
                <p className="text-sm text-gray-600">
                  {venta.tipo_tarjeta} • Op: {venta.numero_operacion}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalPOS
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
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
  const depositos = turno.depositos_caja ?? turno.depositos ?? []

  const handleAgregar = async (data) => {
    try {
      await agregarDeposito(turno.id, {
        monto: data.monto,
        recibido_por: data.recibido_por || null,
        numero_comprobante: data.numero_comprobante || null,
        observaciones: data.observaciones || null
      })
      onMensaje('Depósito agregado correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar depósito', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Depósitos en Caja</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Depósito
          </button>
        )}
      </div>

      <div className="space-y-3">
        {depositos.map(deposito => (
          <div key={deposito.id} className="card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">S/ {deposito.monto}</p>
                {deposito.observaciones && (
                  <p className="text-sm text-gray-600">{deposito.observaciones}</p>
                )}
                {deposito.recibido_por && (
                  <p className="text-xs text-gray-500">Recibido por: {deposito.recibido_por}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalDeposito
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
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
              La lectura inicial propuesta es la <strong>lectura final del último turno cerrado</strong>
              para este contómetro; si no hay historial, se usa <strong>0</strong>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lectura Inicial (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.lectura_inicial}
              onChange={e =>
                setFormData({
                  ...formData,
                  lectura_inicial: e.target.value,
                })
              }
              required
              disabled={prefillLoading && !!formData.contometro_id}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lectura Final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.lectura_final}
              onChange={e =>
                setFormData({
                  ...formData,
                  lectura_final: e.target.value,
                })
              }
              required
              disabled={prefillLoading && !!formData.contometro_id}
            />
            <p className="text-xs text-gray-500 mt-1">
              Puede igualar la inicial y registrar el final después con &quot;Registrar Final&quot;.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Precio de venta (solo lectura)</label>
            <input
              type="text"
              readOnly
              className="input bg-gray-50 text-gray-800 cursor-not-allowed"
              value={
                formData.precio_venta !== ''
                  ? `S/ ${formData.precio_venta}${productoNombre ? ` · ${productoNombre}` : ''}`
                  : prefillLoading
                    ? 'Cargando…'
                    : '—'
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Tomado del producto/combustible en mantenimiento; el servidor valida el mismo valor al guardar.
            </p>
          </div>

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

function ModalLecturaFinal({ lectura, onClose, onSubmit }) {
  const [lecturaFinal, setLecturaFinal] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(parseFloat(lecturaFinal))
  }

  const diferencia = lecturaFinal ? parseFloat(lecturaFinal) - parseFloat(lectura.lectura_inicial) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Registrar Lectura Final</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Lectura Inicial</p>
          <p className="text-xl font-bold">{lectura.lectura_inicial} gal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Lectura Final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={lecturaFinal}
              onChange={e => setLecturaFinal(e.target.value)}
              required
              autoFocus
            />
          </div>
          
          {lecturaFinal && (
            <div className="p-3 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-700">Total Vendido</p>
              <p className="text-2xl font-bold text-primary-900">{diferencia.toFixed(2)} gal</p>
              <p className="text-sm text-primary-700 mt-1">
                Total: S/ {(diferencia * parseFloat(lectura.precio_venta)).toFixed(2)}
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

function ModalPOS({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    monto: '',
    numero_operacion: '',
    tipo_tarjeta: 'credito',
    numero_lote: '',
    terminal_id: '',
    autorizacion: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nueva Venta POS</h3>
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
            <label className="block text-sm font-medium mb-2">Número de Operación</label>
            <input
              type="text"
              className="input"
              value={formData.numero_operacion}
              onChange={e => setFormData({...formData, numero_operacion: e.target.value})}
              required
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
              Guardar
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

function ModalDeposito({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    monto: '',
    observaciones: '',
    numero_comprobante: '',
    recibido_por: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nuevo Depósito</h3>
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
              Guardar
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
            <span>(-) Vales:</span>
            <span className="font-semibold">S/ {totales.totalVales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Depósitos:</span>
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
