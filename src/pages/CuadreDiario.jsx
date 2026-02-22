import { useState, useEffect } from 'react'
import { Calculator, X, Save, Search } from 'lucide-react'
import { guardarCuadreCompleto, obtenerCuadreHoy } from '../utils/api'
import ModalCreditos from '../components/cuadre/ModalCreditos'
import ModalDescuentos from '../components/cuadre/ModalDescuentos'
import ModalDeposito from '../components/cuadre/ModalDeposito'
import ModalVentaProductos from '../components/cuadre/ModalVentaProductos'
import ModalGastoAutorizado from '../components/cuadre/ModalGastoAutorizado'
import ModalContometros from '../components/cuadre/ModalContometros'
import ModalVales from '../components/cuadre/ModalVales'
import ModalPOS from '../components/cuadre/ModalPOS'

// Componente para las tarjetas de cada bloque
function BloqueCuadre({ title, amount, onClick }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-4">
        S/ {amount.toFixed(2)}
      </div>
      <button 
        onClick={onClick}
        className="w-full py-2 px-4 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
      >
        Ver Detalle / Editar
      </button>
    </div>
  )
}

// Componente Modal Genérico (Solo para los que faltan implementar)
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function CuadreDiario() {
  // Estado para los montos (totales)
  const [valores, setValores] = useState({
    depositos: 0,
    contometros: 0,
    productos: 0,
    creditos: 0,
    descuentos: 0,
    gastos: 0,
    vales: 0,
    pos: 0
  })

  // Estado para controlar qué modal está abierto
  const [modalAbierto, setModalAbierto] = useState(null)

  // Estado para la fecha
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    // Ajustar a zona horaria local (Perú/System)
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset);
    return localDate.toISOString().split('T')[0];
  })
  
  // Estado de carga
  const [isLoading, setIsLoading] = useState(false)
  const [notificacion, setNotificacion] = useState(null) // { tipo: 'success'|'error', mensaje: string }

  const mostrarNotificacion = (tipo, mensaje) => {
    setNotificacion({ tipo, mensaje })
    setTimeout(() => setNotificacion(null), 6000)
  }

  // --- ESTADOS ESPECÍFICOS DE LOS MODALES ---
  // Almacenamos la info detallada aquí para enviarla al backend luego
  const [detallesCreditos, setDetallesCreditos] = useState([])
  const [detallesDescuentos, setDetallesDescuentos] = useState([])
  const [detallesDepositos, setDetallesDepositos] = useState([])
  const [detallesProductos, setDetallesProductos] = useState([])
  const [detallesGastos, setDetallesGastos] = useState([])
  const [detallesContometros, setDetallesContometros] = useState([])
  const [detallesVales, setDetallesVales] = useState([])
  const [detallesPOS, setDetallesPOS] = useState([])

  const handleSaveCreditos = (lista) => {
    setDetallesCreditos(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, creditos: total }))
  }

  const handleSaveDescuentos = (lista) => {
    setDetallesDescuentos(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.montoDescuento), 0)
    setValores(prev => ({ ...prev, descuentos: total }))
  }

  const handleSaveDepositos = (lista) => {
    setDetallesDepositos(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, depositos: total }))
  }

  const handleSaveProductos = (lista) => {
    setDetallesProductos(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, productos: total }))
  }

  const handleSaveGastos = (lista) => {
    setDetallesGastos(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, gastos: total }))
  }

  const handleSaveContometros = (lista) => {
    setDetallesContometros(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, contometros: total }))
  }

  const handleSaveVales = (lista) => {
    setDetallesVales(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, vales: total }))
  }

  const handleSavePOS = (lista) => {
    setDetallesPOS(lista)
    const total = lista.reduce((acc, curr) => acc + parseFloat(curr.monto), 0)
    setValores(prev => ({ ...prev, pos: total }))
  }



  const handleGuardarCuadre = async () => {
    // Validación: al menos un bloque de detalle debe tener datos
    const tieneDetalles = 
      detallesDepositos.length > 0 ||
      detallesProductos.length > 0 ||
      detallesCreditos.length > 0 ||
      detallesDescuentos.length > 0 ||
      detallesGastos.length > 0 ||
      detallesContometros.length > 0 ||
      detallesVales.length > 0 ||
      detallesPOS.length > 0
    
    if (!tieneDetalles) {
      mostrarNotificacion('error', 'Debe agregar al menos un detalle antes de guardar el cuadre.')
      return
    }
    
    try {
      const payload = {
        fecha: fecha,
        detalles: {
          depositos: detallesDepositos.map(d => ({
            monto: parseFloat(d.monto),
            recibido_por: d.recibidoPor ? parseInt(d.recibidoPor) : null,
            numero_comprobante: d.numeroComprobante || null,
            observaciones: d.observaciones || null
          })),
          productos: detallesProductos.map(p => ({
            producto_id: parseInt(p.productoId),
            cantidad: parseFloat(p.cantidad),
            precio_unitario: parseFloat(p.precioUnit),
            nombre_producto: p.productoNombre,
            monto_total: parseFloat(p.monto)
          })),
          creditos: detallesCreditos.map(c => ({
            cliente_id: parseInt(c.clienteId),
            monto: parseFloat(c.monto),
            numero_documento: c.documento || c.numeroDocumento || null,
            fecha_vencimiento: c.fechaVencimiento || new Date().toISOString().split('T')[0],
            observaciones: c.observaciones || null
          })),
          descuentos: detallesDescuentos.map(d => {
            const montoVenta = parseFloat(d.montoVenta) || 0
            const porcentaje = parseFloat(d.porcentaje || d.porcentajeDescuento) || 0
            const montoDescuento = parseFloat(d.montoDescuento) || (montoVenta * porcentaje / 100)
            const montoFinal = montoVenta - montoDescuento
            
            return {
              cliente_id: parseInt(d.clienteId),
              monto_venta: montoVenta,
              porcentaje_descuento: porcentaje,
              monto_descuento: parseFloat(montoDescuento.toFixed(2)),
              monto_final: parseFloat(montoFinal.toFixed(2))
            }
          }),
          gastos: detallesGastos.map(g => ({
            tipo_vale_id: parseInt(g.tipoId),
            monto: parseFloat(g.monto),
            proveedor: g.proveedor,
            numero_factura: g.numeroDocumento,
            observaciones: g.observaciones
          })),
          contometros: detallesContometros.map(c => ({
            contometro_id: parseInt(c.contometroId),
            lectura_inicial: parseFloat(c.lecturaInicial),
            lectura_final: parseFloat(c.lecturaFinal),
            precio_venta: parseFloat(c.precio)
          })),
          vales: detallesVales.map(v => ({
            tipo_vale_id: parseInt(v.tipoId),
            monto: parseFloat(v.monto),
            beneficiario: v.beneficiario || 'N/A',
            numero_vale: v.numeroVale || 'S/N',
            observaciones: v.observaciones || null
          })),
          pos: detallesPOS.map(p => ({
            monto: parseFloat(p.monto),
            numero_lote: p.numeroLote || 'S/L',
            numero_operacion: p.numeroOperacion || 'S/N',
            tipo_tarjeta: (p.tipoTarjeta || 'debito').toLowerCase(),
            terminal_id: parseInt(p.terminalId)
          }))
        },
        cabecera: (() => {
            const ingresoDepositos = detallesDepositos.reduce((acc, curr) => 
              acc + parseFloat(curr.monto || 0), 0)  
            const ingresoContometros = detallesContometros.reduce((acc, curr) => 
              acc + ((parseFloat(curr.lecturaFinal || 0) - parseFloat(curr.lecturaInicial || 0)) * parseFloat(curr.precio || 0)), 0)
            const ingresoProductos = detallesProductos.reduce((acc, curr) => 
              acc + (parseFloat(curr.cantidad || 0) * parseFloat(curr.precioUnit || 0)), 0)
            
            const egresoCreditos = detallesCreditos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0)
            const egresoDescuentos = detallesDescuentos.reduce((acc, curr) => acc + parseFloat(curr.montoDescuento || 0), 0)
            const egresoGastos = detallesGastos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0)
            const egresoVales = detallesVales.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0)
            const egresoPOS = detallesPOS.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0)

            const montoIngresos = ingresoContometros + ingresoProductos + ingresoDepositos
            const montoEgresos = egresoGastos + egresoVales + egresoCreditos + egresoPOS + egresoDescuentos
            const montoFinal = montoIngresos - montoEgresos

            return {
              monto_ingresos: parseFloat(montoIngresos.toFixed(2)),
              monto_egresos: parseFloat(montoEgresos.toFixed(2)),
              monto_final: parseFloat(montoFinal.toFixed(2))
            }
        })()
      }

      console.log("Enviando payload:", payload)
      const response = await guardarCuadreCompleto(payload)
      mostrarNotificacion('success', response.message || '¡Cuadre guardado exitosamente!')
      
    } catch (error) {
      console.error("Error guardando cuadre:", error)
      const detail = error.response?.data?.detail
      let msg = 'Error al guardar el cuadre'
      if (Array.isArray(detail)) {
        // Errores de validación Pydantic: [{loc, msg, type}]
        msg = detail.map(e => `• ${e.loc?.slice(-1)[0] ?? ''}: ${e.msg}`).join('\n')
      } else if (typeof detail === 'string') {
        msg = detail
      }
      mostrarNotificacion('error', msg)
    }
  }

  const handleBuscarCuadre = async () => {
    console.log("Buscando datos real para la fecha:", fecha)
    setIsLoading(true)
    
    try {
      const data = await obtenerCuadreHoy(fecha)
      console.log("Data received from backend:", data)
      
      if (data) {
        // Mapear respuesta del backend (SnakeCase) a estado del frontend (CamelCase)
        
        // 1. Depósitos
        const depositos = data.detalles?.depositos?.map(d => ({
          id: d.id,
          monto: d.monto,
          recibidoPor: d.recibido_por,
          numeroComprobante: d.numero_comprobante,
          observaciones: d.observaciones,
          nombreEmpleado: d.nombre_empleado
        })) || []
        setDetallesDepositos(depositos)

        // 2. Productos
        const productos = data.detalles?.productos?.map(p => ({
          id: p.id,
          productoId: p.producto_id,
          productoNombre: p.nombre_producto || 'Producto',
          cantidad: p.cantidad,
          precioUnit: p.precio_unitario,
          monto: (parseFloat(p.cantidad) * parseFloat(p.precio_unitario)).toFixed(2)
        })) || []
        setDetallesProductos(productos)

        // 3. Créditos
        const creditos = data.detalles?.creditos?.map(c => ({
          id: c.id,
          clienteId: c.cliente_id,
          nombre: c.nombre_cliente || 'Cliente',
          monto: c.monto,
          numeroDocumento: c.numero_documento,
          fechaVencimiento: c.fecha_vencimiento,
          observaciones: c.observaciones
        })) || []
        setDetallesCreditos(creditos)

        // 4. Descuentos
        const descuentos = data.detalles?.descuentos?.map(d => ({
          id: d.id,
          clienteId: d.cliente_id,
          nombre: d.nombre_cliente || 'Cliente',
          montoVenta: d.monto_venta,
          porcentajeDescuento: d.porcentaje_descuento,
          porcentaje: d.porcentaje_descuento,
          montoDescuento: (parseFloat(d.monto_venta) * parseFloat(d.porcentaje_descuento) / 100).toFixed(2),
          motivo: d.motivo
        })) || []
        setDetallesDescuentos(descuentos)

        // 5. Gastos
        const gastos = data.detalles?.gastos?.map(g => ({
          id: g.id,
          monto: g.monto,
          tipoId: g.tipo_vale_id,
          tipoNombre: g.nombre_tipo || 'Gasto Operativo',
          proveedor: g.proveedor,
          numeroDocumento: g.numero_factura,
          observaciones: g.observaciones
        })) || []
        setDetallesGastos(gastos)

        // 6. Contómetros
        const contometros = data.detalles?.contometros?.map(c => ({
          id: c.id,
          contometroId: c.contometro_id,
          codigo: c.codigo_contometro || '', 
          lecturaInicial: c.lectura_inicial,
          lecturaFinal: c.lectura_final,
          precio: c.precio_venta,
          galones: (parseFloat(c.lectura_final) - parseFloat(c.lectura_inicial)).toFixed(2),
          monto: ((parseFloat(c.lectura_final) - parseFloat(c.lectura_inicial)) * parseFloat(c.precio_venta)).toFixed(2)
        })) || []
        setDetallesContometros(contometros)

        // 7. Vales
        const vales = data.detalles?.vales?.map(v => ({
          id: v.id,
          tipoId: v.tipo_vale_id,
          tipo: v.nombre_tipo || 'Vale', 
          monto: v.monto,
          beneficiario: v.beneficiario,
          numeroVale: v.numero_vale
        })) || []
        setDetallesVales(vales)

        // 8. POS
        const pos = data.detalles?.pos?.map(p => ({
          id: p.id,
          monto: p.monto,
          numeroOperacion: p.numero_operacion,
          tipoTarjeta: p.tipo_tarjeta?.toUpperCase() || 'DESCONOCIDO',
          numeroLote: p.numero_lote,
          terminalId: p.terminal_id,
          terminalNombre: p.nombre_terminal
        })) || []
        setDetallesPOS(pos)

        // Actualizar Totales (Valores)
        setValores({
          depositos: depositos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0),
          contometros: contometros.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0), 
          productos: productos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0),
          creditos: creditos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0),
          descuentos: descuentos.reduce((acc, curr) => acc + parseFloat(curr.montoDescuento || 0), 0),
          gastos: gastos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0),
          vales: vales.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0),
          pos: pos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0)
        })

      } 
    } catch (error) {
       // Si es 404, limpiamos todo (comportamiento esperado "inicializar en cero")
       if (error.response && error.response.status === 404) {
          console.log("No se encontraron datos, inicializando en cero.")
       } else {
          console.error("Error al buscar cuadre:", error)
          // Opcional: mostrar error si no es 404
       }
       
       // Limpiar / Inicializar en Cero
       setValores({
        depositos: 0,
        contometros: 0,
        productos: 0,
        creditos: 0,
        descuentos: 0,
        gastos: 0,
        vales: 0,
        pos: 0
      })
      setDetallesDepositos([])
      setDetallesContometros([])
      setDetallesProductos([])
      setDetallesCreditos([])
      setDetallesDescuentos([])
      setDetallesGastos([])
      setDetallesVales([])
      setDetallesPOS([])
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar datos al iniciar
  useEffect(() => {
    handleBuscarCuadre()
  }, [fecha])


  // Cálculos globales
  const totalIngresos = valores.depositos + valores.contometros + valores.productos
  const totalEgresos = valores.creditos + valores.descuentos + valores.gastos + valores.vales + valores.pos
  const saldoFinal = totalIngresos - totalEgresos

  const handleOpenModal = (tipo) => {
    setModalAbierto(tipo)
  }

  const handleCloseModal = () => {
    setModalAbierto(null)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto relative min-h-screen">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-2 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-primary-700 font-medium">Cargando datos...</span>
          </div>
        </div>
      )}

      {/* Banner de Notificación */}
      {notificacion && (
        <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${
          notificacion.tipo === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="text-xl leading-none">
            {notificacion.tipo === 'success' ? '✅' : '❌'}
          </span>
          <pre className="flex-1 text-sm font-medium whitespace-pre-wrap break-words font-sans">
            {notificacion.mensaje}
          </pre>
          <button onClick={() => setNotificacion(null)} className="text-current opacity-50 hover:opacity-100 text-xl leading-none">×</button>
        </div>
      )}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-8 h-8 text-primary-600" />
            Cuadre Contable por Usuario
          </h1>
          <p className="text-gray-500 mt-1">Gestión y balance diario de operaciones</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="bg-blue-600 p-2 pl-4 rounded-xl shadow-sm border border-blue-700 flex items-center gap-2">
            <label htmlFor="fecha-cuadre" className="font-bold text-white text-sm md:text-base">
              FECHA DE CUADRE:
            </label>
            <input 
              type="date" 
              id="fecha-cuadre"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border-transparent rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 font-medium h-9 text-sm"
            />
            <button 
              onClick={handleBuscarCuadre}
              className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
              title="Buscar Cuadre por Fecha"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          
          <button 
            onClick={handleGuardarCuadre}
            className="p-4 bg-green-600 text-white rounded-xl shadow-sm border border-green-700 font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-6 h-6" />
            GUARDAR CUADRE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna 1: INGRESOS */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-green-700 uppercase tracking-wide border-b-2 border-green-200 pb-2">
            Ingresos
          </h2>
          <div className="space-y-4">
            <BloqueCuadre 
              title="Depósito Caja" 
              amount={valores.depositos} 
              onClick={() => handleOpenModal('depositos')} 
            />
            <BloqueCuadre 
              title="Contómetros" 
              amount={valores.contometros} 
              onClick={() => handleOpenModal('contometros')} 
            />
            <BloqueCuadre 
              title="Venta Productos" 
              amount={valores.productos} 
              onClick={() => handleOpenModal('productos')} 
            />
          </div>
          <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center border border-green-100 mt-4">
            <span className="font-medium text-green-800">Total Ingresos</span>
            <span className="font-bold text-xl text-green-800">S/ {totalIngresos.toFixed(2)}</span>
          </div>
        </div>

        {/* Columna 2: EGRESOS */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-red-700 uppercase tracking-wide border-b-2 border-red-200 pb-2">
            Egresos
          </h2>
          <div className="space-y-4">
            <BloqueCuadre 
              title="Créditos" 
              amount={valores.creditos} 
              onClick={() => handleOpenModal('creditos')} 
            />
            <BloqueCuadre 
              title="Descuentos" 
              amount={valores.descuentos} 
              onClick={() => handleOpenModal('descuentos')} 
            />
            <BloqueCuadre 
              title="Gasto Autorizado" 
              amount={valores.gastos} 
              onClick={() => handleOpenModal('gastos')} 
            />
            <BloqueCuadre 
              title="Vales" 
              amount={valores.vales} 
              onClick={() => handleOpenModal('vales')} 
            />
            <BloqueCuadre 
              title="POS" 
              amount={valores.pos} 
              onClick={() => handleOpenModal('pos')} 
            />
          </div>
          <div className="bg-red-50 p-4 rounded-lg flex justify-between items-center border border-red-100 mt-4">
            <span className="font-medium text-red-800">Total Egresos</span>
            <span className="font-bold text-xl text-red-800">S/ {totalEgresos.toFixed(2)}</span>
          </div>
        </div>

        {/* Columna 3: SALDO */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-blue-700 uppercase tracking-wide border-b-2 border-blue-200 pb-2">
            Saldo Final
          </h2>
          
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center sticky top-8">
            <p className="text-gray-500 font-medium mb-2">Balance Total</p>
            <div className={`text-5xl font-bold mb-4 ${saldoFinal >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              S/ {saldoFinal.toFixed(2)}
            </div>
            <div className="flex justify-center gap-2 text-sm text-gray-500">
              <span>Ingresos: +{totalIngresos.toFixed(2)}</span>
              <span>•</span>
              <span>Egresos: -{totalEgresos.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Renderizado Condicional de Modales Específicos */}
      <ModalCreditos 
        isOpen={modalAbierto === 'creditos'}
        onClose={handleCloseModal}
        onSave={handleSaveCreditos}
        listaInicial={detallesCreditos}
        fecha={fecha}
      />

      <ModalDescuentos 
        isOpen={modalAbierto === 'descuentos'}
        onClose={handleCloseModal}
        onSave={handleSaveDescuentos}
        listaInicial={detallesDescuentos}
      />

      <ModalDeposito 
        isOpen={modalAbierto === 'depositos'}
        onClose={handleCloseModal}
        onSave={handleSaveDepositos}
        listaInicial={detallesDepositos}
      />

      <ModalVentaProductos 
        isOpen={modalAbierto === 'productos'}
        onClose={handleCloseModal}
        onSave={handleSaveProductos}
        listaInicial={detallesProductos}
      />

      <ModalGastoAutorizado 
        isOpen={modalAbierto === 'gastos'}
        onClose={handleCloseModal}
        onSave={handleSaveGastos}
        listaInicial={detallesGastos}
      />

      <ModalContometros 
        isOpen={modalAbierto === 'contometros'}
        onClose={handleCloseModal}
        onSave={handleSaveContometros}
        listaInicial={detallesContometros}
      />

      <ModalVales 
        isOpen={modalAbierto === 'vales'}
        onClose={handleCloseModal}
        onSave={handleSaveVales}
        listaInicial={detallesVales}
      />

      <ModalPOS 
        isOpen={modalAbierto === 'pos'}
        onClose={handleCloseModal}
        onSave={handleSavePOS}
        listaInicial={detallesPOS}
      />

      {/* Modales Genéricos (para los que faltan) */}
      <Modal 
        isOpen={modalAbierto !== null && modalAbierto !== 'creditos' && modalAbierto !== 'descuentos' && modalAbierto !== 'depositos' && modalAbierto !== 'productos' && modalAbierto !== 'gastos' && modalAbierto !== 'contometros' && modalAbierto !== 'vales' && modalAbierto !== 'pos'}
        onClose={handleCloseModal}
        title={`Detalle de ${modalAbierto ? modalAbierto.charAt(0).toUpperCase() + modalAbierto.slice(1) : ''}`}
      >
        <div className="text-center py-8 text-gray-500">
          <p>Funcionalidad de cálculo para <strong>{modalAbierto}</strong> en desarrollo.</p>
        </div>
        <div className="flex justify-end mt-4">
          <button 
            onClick={handleCloseModal}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  )
}


