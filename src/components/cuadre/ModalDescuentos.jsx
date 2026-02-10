import { useState, useEffect } from 'react'
import { Search, Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getClienteByDocumento } from '../../utils/api'

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

export default function ModalDescuentos({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaDescuentos, setListaDescuentos] = useState(listaInicial)
  const [nuevo, setNuevo] = useState({ 
    documento: '', 
    nombre: '', 
    montoVenta: '', 
    porcentaje: '', 
    montoDescuento: '' 
  })
  const [buscandoCliente, setBuscandoCliente] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setListaDescuentos(listaInicial)
    }
  }, [isOpen, listaInicial])

  // Lógica de autocompletado de descuentos
  useEffect(() => {
    const venta = parseFloat(nuevo.montoVenta)
    if (isNaN(venta) || venta <= 0) return

    // Si cambió el porcentaje, calcular monto descuento
    if (nuevo.lastEdited === 'porcentaje') {
      const pct = parseFloat(nuevo.porcentaje)
      if (!isNaN(pct)) {
        const descuento = (venta * pct) / 100
        setNuevo(prev => ({ 
          ...prev, 
          montoDescuento: descuento.toFixed(2),
          lastEdited: null // Reset flag
        }))
      }
    }
    // Si cambió el monto descuento, calcular porcentaje
    else if (nuevo.lastEdited === 'montoDescuento') {
      const desc = parseFloat(nuevo.montoDescuento)
      if (!isNaN(desc)) {
        const pct = (desc / venta) * 100
        setNuevo(prev => ({ 
          ...prev, 
          porcentaje: pct.toFixed(2),
          lastEdited: null // Reset flag
        }))
      }
    }
  }, [nuevo.porcentaje, nuevo.montoDescuento, nuevo.montoVenta, nuevo.lastEdited])

  const buscarCliente = async () => {
    if (!nuevo.documento) return
    setBuscandoCliente(true)
    try {
      const cliente = await getClienteByDocumento(nuevo.documento)
      if (cliente) {
        setNuevo(prev => ({ ...prev, nombre: cliente.razon_social || cliente.nombre_comercial }))
      } else {
        alert("Cliente no encontrado")
        setNuevo(prev => ({ ...prev, nombre: '' }))
      }
    } catch (error) {
       console.error("Error buscando cliente:", error)
       alert("Error al buscar cliente")
    } finally {
      setBuscandoCliente(false)
    }
  }

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ 
      ...prev, 
      [field]: value,
      lastEdited: (field === 'porcentaje' || field === 'montoDescuento') ? field : prev.lastEdited
    }))
  }

  const agregarDescuento = () => {
    if (!nuevo.documento || !nuevo.montoDescuento || !nuevo.nombre) return
    setListaDescuentos([...listaDescuentos, { ...nuevo, id: Date.now() }])
    setNuevo({ documento: '', nombre: '', montoVenta: '', porcentaje: '', montoDescuento: '', lastEdited: null })
  }

  const eliminarDescuento = (id) => {
    setListaDescuentos(listaDescuentos.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaDescuentos)
    onClose()
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Descuentos">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-12 gap-3 items-end">
            
            {/* Cliente */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cliente (Doc)</label>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Doc"
                  value={nuevo.documento}
                  onChange={e => handleInputChange('documento', e.target.value.replace(/\D/g, ''))}
                />
                <button 
                  onClick={buscarCliente}
                  disabled={buscandoCliente}
                  className="h-10 w-10 flex-none flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monto Venta */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto Venta</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                placeholder="0.00"
                value={nuevo.montoVenta}
                onChange={e => handleInputChange('montoVenta', e.target.value)}
              />
            </div>

            {/* Porcentaje */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Porcentaje %</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                placeholder="%"
                value={nuevo.porcentaje}
                onChange={e => handleInputChange('porcentaje', e.target.value)}
              />
            </div>

            {/* Monto Descuento */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto Desc.</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-red-600"
                placeholder="0.00"
                value={nuevo.montoDescuento}
                onChange={e => handleInputChange('montoDescuento', e.target.value)}
              />
            </div>
            
            {/* Botón Agregar */}
            <div className="col-span-2 flex justify-end">
              <button 
                onClick={agregarDescuento}
                className="h-10 w-full flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <PlusCircle className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {nuevo.nombre && (
             <div className="mt-2 text-xs text-gray-600 font-medium bg-white p-2 rounded border border-gray-200">
               {nuevo.nombre}
             </div>
          )}
        </div>

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Venta</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Desc.</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaDescuentos.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                    <div className="text-xs text-gray-500">{item.documento}</div>
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    S/ {parseFloat(item.montoVenta).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    {item.porcentaje}%
                  </td>
                   <td className="px-4 py-2 text-right text-sm font-bold text-red-600">
                    S/ {parseFloat(item.montoDescuento).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => eliminarDescuento(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaDescuentos.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay descuentos registrados
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
