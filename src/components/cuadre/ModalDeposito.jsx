import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X } from 'lucide-react'

// Componente Modal Genérico (Podría extraerse a un archivo común utils/components)
function ModalWrapper({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
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

export default function ModalDeposito({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaDepositos, setListaDepositos] = useState(listaInicial)
  const [nuevo, setNuevo] = useState({ 
    numeroComprobante: '', 
    recibidoPor: '', 
    monto: '',
    observaciones: '' 
  })

  useEffect(() => {
    if (isOpen) {
      setListaDepositos(listaInicial)
    }
  }, [isOpen, listaInicial])

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarDeposito = () => {
    if (!nuevo.monto || parseFloat(nuevo.monto) <= 0) return
    
    setListaDepositos([...listaDepositos, { ...nuevo, id: Date.now() }])
    setNuevo({ numeroComprobante: '', recibidoPor: '', monto: '', observaciones: '' })
  }

  const eliminarDeposito = (id) => {
    setListaDepositos(listaDepositos.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaDepositos)
    onClose()
  }


  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Depósito Caja">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex gap-4 items-end">

            {/* Monto */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Monto (S/)</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-gray-900 text-lg"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={nuevo.monto}
                onChange={e => handleInputChange('monto', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarDeposito()}
              />
            </div>
            
            {/* Botón Agregar */}
            <button 
              onClick={agregarDeposito}
              className="h-10 w-12 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              title="Agregar depósito"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
          
          {/* Observaciones (Opcional) */}
          <div className="mt-3">
             <input 
                type="text" 
                className="w-full h-8 border-gray-300 rounded-md text-sm placeholder-gray-400"
                placeholder="Observaciones adicionales (opcional)"
                value={nuevo.observaciones}
                onChange={e => handleInputChange('observaciones', e.target.value)}
              />
          </div>
        </div>

        {/* Listado simplificado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">N°</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaDepositos.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-center text-sm text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    S/ {parseFloat(item.monto).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => eliminarDeposito(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaDepositos.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay depósitos registrados
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
