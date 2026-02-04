import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Fuel, CheckCircle, AlertCircle, Gauge, ShoppingCart,
  CreditCard, Receipt, DollarSign, ArrowLeft, Clock
} from 'lucide-react'
import {
  getTurnoById,
  getContometrosActivos,
  getProductosActivos
} from '../utils/api'

function DetalleTurno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [turno, setTurno] = useState(null)
  const [contometros, setContometros] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [tabActiva, setTabActiva] = useState('lecturas')

  useEffect(() => {
    cargarDatos()
  }, [id])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      const [turnoData, contometrosData, productosData] = await Promise.all([
        getTurnoById(id),
        getContometrosActivos(),
        getProductosActivos()
      ])
      
      setTurno(turnoData)
      setContometros(contometrosData)
      setProductos(productosData.filter(p => p.categoria !== 'combustible'))
      
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 3000)
  }

  // Calcular totales
  const calcularTotales = () => {
    if (!turno) return null

    return {
      totalCombustible: parseFloat(turno.total_venta_combustible || 0),
      totalProductos: parseFloat(turno.total_venta_productos || 0),
      totalPOS: parseFloat(turno.total_ventas_pos || 0),
      totalCredito: parseFloat(turno.total_ventas_credito || 0),
      totalDescuentos: parseFloat(turno.total_descuentos || 0),
      totalVales: parseFloat(turno.total_vales || 0),
      totalGastos: parseFloat(turno.total_gastos_autorizados || 0),
      totalDepositos: parseFloat(turno.total_depositos_caja || 0),
      totalGalones: parseFloat(turno.total_galones_vendidos || 0),
      efectivoEsperado: parseFloat(turno.efectivo_esperado || 0),
      efectivoEntregado: parseFloat(turno.efectivo_entregado || 0),
      diferencia: parseFloat(turno.diferencia || 0)
    }
  }

  const totales = calcularTotales()

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

  if (!turno) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Turno no encontrado</p>
          <button onClick={() => navigate('/liquidacion')} className="btn btn-primary mt-4">
            Volver
          </button>
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/liquidacion')}
                className="btn btn-secondary"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Detalle de Turno</h1>
                <p className="text-sm text-gray-600">
                  {turno.codigo} • {user?.nombres} {user?.apellidos}
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full ${
              turno.estado_id === 1 ? 'bg-green-100 text-green-800' :
              turno.estado_id === 2 ? 'bg-gray-100 text-gray-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              <span className="text-sm font-medium">
                {turno.estado_id === 1 ? 'ABIERTO' : 
                 turno.estado_id === 2 ? 'CERRADO' : 'AUDITADO'}
              </span>
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
        {/* Resumen de Totales */}
        {totales && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Combustible</p>
              <p className="text-2xl font-bold text-primary-600">
                S/ {totales.totalCombustible.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totales.totalGalones.toFixed(2)} gal
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
              <p className="text-sm text-gray-600 mb-1">Crédito</p>
              <p className="text-2xl font-bold text-purple-600">
                S/ {totales.totalCredito.toFixed(2)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 mb-1">Vales</p>
              <p className="text-2xl font-bold text-red-600">
                S/ {totales.totalVales.toFixed(2)}
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

        {/* Resultado del Cierre (si está cerrado) */}
        {turno.estado_id === 2 && totales && (
          <div className={`card p-6 mb-6 ${
            totales.diferencia === 0 ? 'bg-green-50 border-green-200' :
            totales.diferencia < 0 ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">
                {totales.diferencia === 0 ? '✅ Turno Cuadrado' :
                 totales.diferencia < 0 ? '❌ Turno con Faltante' :
                 '⚠️ Turno con Sobrante'}
              </h3>
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-4">
                <div>
                  <p className="text-sm text-gray-600">Efectivo Esperado</p>
                  <p className="text-lg font-bold">S/ {totales.efectivoEsperado.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efectivo Entregado</p>
                  <p className="text-lg font-bold">S/ {totales.efectivoEntregado.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Diferencia</p>
                  <p className={`text-lg font-bold ${
                    totales.diferencia === 0 ? 'text-green-600' :
                    totales.diferencia < 0 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    S/ {Math.abs(totales.diferencia).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs de Detalle */}
        <div className="card">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: 'lecturas', label: 'Lecturas Contómetro', icon: Gauge },
                { id: 'productos', label: 'Ventas Productos', icon: ShoppingCart },
                { id: 'pos', label: 'Ventas POS', icon: CreditCard },
                { id: 'credito', label: 'Ventas Crédito', icon: Receipt },
                { id: 'otros', label: 'Otros Movimientos', icon: DollarSign },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

          <div className="p-6">
            {tabActiva === 'lecturas' && (
              <div className="text-center py-8 text-gray-500">
                <Gauge className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Detalles de lecturas de contómetro</p>
                <p className="text-sm mt-2">
                  {turno.lecturas_contometro?.length || 0} lecturas registradas
                </p>
              </div>
            )}
            {tabActiva === 'productos' && (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Detalles de ventas de productos</p>
                <p className="text-sm mt-2">
                  {turno.ventas_producto?.length || 0} ventas registradas
                </p>
              </div>
            )}
            {tabActiva === 'pos' && (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Detalles de ventas POS</p>
                <p className="text-sm mt-2">
                  {turno.ventas_pos?.length || 0} ventas registradas
                </p>
              </div>
            )}
            {tabActiva === 'credito' && (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Detalles de ventas a crédito</p>
                <p className="text-sm mt-2">
                  {turno.ventas_credito?.length || 0} ventas registradas
                </p>
              </div>
            )}
            {tabActiva === 'otros' && (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Otros movimientos (vales, depósitos, gastos)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetalleTurno
