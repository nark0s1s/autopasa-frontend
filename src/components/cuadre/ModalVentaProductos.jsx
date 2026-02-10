import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X, Search } from 'lucide-react'
import { getProductos } from '../../utils/api'

// Componente Modal Genérico (Podría extraerse a un archivo común utils/components)
function ModalWrapper({ isOpen, onClose, title, children }) {
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

export default function ModalVentaProductos({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaVentas, setListaVentas] = useState(listaInicial)
  const [nuevo, setNuevo] = useState({ 
    productoId: '', 
    productoNombre: '', 
    precioUnit: '', 
    cantidad: '', 
    monto: '' 
  })
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  
  const [productosDisponibles, setProductosDisponibles] = useState([]) // Initialize with empty array, will be populated by fetch or mock
  const [cargando, setCargando] = useState(false)

  // Cargar productos desde API
  useEffect(() => {
    const fetchProductos = async () => {
      if (isOpen) {
        setCargando(true)
        try {
          const data = await getProductos()
          if (data && data.length > 0) {
            const productosMapeados = data.map(p => ({
              id: p.id,
              nombre: p.nombre,
              precio: parseFloat(p.precio_venta || 0)
            }))
            setProductosDisponibles(productosMapeados)
          } else {
            setProductosDisponibles(productosMock)
          }
        } catch (error) {
          console.warn("Error API productos (usando mock):", error)
          setProductosDisponibles(productosMock)
        } finally {
           setCargando(false)
        }
      }
    }
    fetchProductos()
  }, [isOpen])

  // Mock de productos
  const productosMock = [
    { id: 1, nombre: 'GASOLINA 90', precio: 15.50 },
    { id: 2, nombre: 'GASOLINA 84', precio: 14.80 },
    { id: 3, nombre: 'GASOLINA 95', precio: 17.20 },
    { id: 4, nombre: 'DIESEL DB5', precio: 16.00 },
    { id: 5, nombre: 'GLP', precio: 8.50 },
    { id: 6, nombre: 'AGUA MINERAL 500ML', precio: 2.50 },
    { id: 7, nombre: 'LATA GASEOSA', precio: 3.50 },
    { id: 8, nombre: 'ACEITE MOTOR 4T', precio: 25.00 },
  ]

  useEffect(() => {
    if (isOpen) {
      setListaVentas(listaInicial)
    }
  }, [isOpen, listaInicial])

  // Lógica de búsqueda
  useEffect(() => {
    if (busqueda.trim() === '') {
      setResultados(productosDisponibles)
    } else {
      const encontrados = productosDisponibles.filter(p => 
        p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
      setResultados(encontrados)
    }
  }, [busqueda, productosDisponibles])

  // Lógica de cálculo automático
  useEffect(() => {
    const cantidad = parseFloat(nuevo.cantidad)
    const precio = parseFloat(nuevo.precioUnit)
    
    if (!isNaN(cantidad) && !isNaN(precio)) {
      setNuevo(prev => ({ ...prev, monto: (cantidad * precio).toFixed(2) }))
    } else {
      setNuevo(prev => ({ ...prev, monto: '' }))
    }
  }, [nuevo.cantidad, nuevo.precioUnit])

  const seleccionarProducto = (producto) => {
    // Adaptar campos segun API o Mock
    // API devuelve: precio_venta
    // Mock tiene: precio
    const precio = producto.precio_venta || producto.precio || 0
    
    setNuevo(prev => ({
      ...prev,
      productoId: producto.id,
      productoNombre: producto.nombre,
      precioUnit: precio,
      cantidad: '1', // Default 1
      monto: precio // Default amount for 1 unit
    }))
    setBusqueda(producto.nombre)
    setResultados([])
  }

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarVenta = () => {
    if (!nuevo.productoNombre || !nuevo.precioUnit || !nuevo.cantidad || !nuevo.monto) return
    
    setListaVentas([...listaVentas, { ...nuevo, id: Date.now() }])
    
    // Resetear formulario
    setNuevo({ productoId: '', productoNombre: '', precioUnit: '', cantidad: '', monto: '' })
    setBusqueda('')
  }

  const eliminarVenta = (id) => {
    setListaVentas(listaVentas.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaVentas)
    onClose()
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Venta Productos">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
          <div className="flex gap-4 items-end">
            
            {/* Buscador de Producto */}
            <div className="flex-1 relative">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Buscar Producto {cargando && <span className="text-gray-400 font-normal">...</span>}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full h-10 pl-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Escriba para buscar..."
                  value={busqueda}
                  onChange={e => {
                    setBusqueda(e.target.value)
                    // Si el usuario borra, limpiamos el producto seleccionado
                    if (e.target.value === '') {
                        setNuevo(prev => ({ ...prev, productoId: '', productoNombre: '', precioUnit: '' }))
                    }
                  }}
                  onFocus={() => {
                        setMostrandoResultados(true)
                  }}
                  onBlur={() => {
                    // Timeout para permitir click en la lista
                    setTimeout(() => setMostrandoResultados(false), 200)
                  }}
                />
                <Search className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" />
              </div>

              {/* Lista de Resultados Flotante */}
              {mostrandoResultados && resultados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {resultados.map(prod => (
                        <div 
                            key={prod.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                            onClick={() => seleccionarProducto(prod)}
                        >
                            {prod.nombre} - <span className="font-semibold text-gray-500">S/ {prod.precio.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
              )}
            </div>

            {/* Precio Unit */}
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Precio Unit</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 text-gray-600 text-center"
                readOnly
                placeholder="0.00"
                value={nuevo.precioUnit}
              />
            </div>

            {/* Cantidad */}
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Cantidad</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                placeholder="0"
                value={nuevo.cantidad}
                onChange={e => handleInputChange('cantidad', e.target.value)}
              />
            </div>

            {/* Monto */}
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 font-bold text-gray-900 text-center"
                readOnly
                placeholder="0.00"
                value={nuevo.monto}
              />
            </div>
            
            {/* Botón Agregar */}
            <button 
              onClick={agregarVenta}
              className="h-10 w-12 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cant.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaVentas.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {item.productoNombre}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    S/ {parseFloat(item.precioUnit).toFixed(2)}
                  </td>
                   <td className="px-4 py-2 text-right text-sm text-gray-600">
                    {item.cantidad}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    S/ {parseFloat(item.monto).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => eliminarVenta(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaVentas.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar y Actualizar
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
