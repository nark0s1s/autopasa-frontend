import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getTiposVale } from '../../utils/api'

// Componente Modal Genérico
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

export default function ModalGastoAutorizado({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaGastos, setListaGastos] = useState(listaInicial)
  const [nuevo, setNuevo] = useState({ 
    tipoId: '', 
    tipoNombre: '', 
    numeroDocumento: '', 
    proveedor: '', 
    monto: '',
    observaciones: '' 
  })
  
  const [tiposVale, setTiposVale] = useState([])
  const [cargando, setCargando] = useState(false)

  // Cargar tipos de vale desde API
  useEffect(() => {
    const fetchTipos = async () => {
      if (isOpen) {
        setCargando(true)
        try {
          const data = await getTiposVale()
          if (data && data.length > 0) {
            setTiposVale(data)
          }
        } catch (error) {
          console.error("Error cargando tipos de vale:", error)
        } finally {
          setCargando(false)
        }
      }
    }
    fetchTipos()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setListaGastos(listaInicial)
    }
  }, [isOpen, listaInicial])

  const handleTipoChange = (e) => {
    const selectedId = parseInt(e.target.value)
    const selected = tiposVale.find(t => t.id === selectedId)
    setNuevo(prev => ({
      ...prev,
      tipoId: selectedId,
      tipoNombre: selected ? selected.nombre : ''
    }))
  }

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarGasto = () => {
    if (!nuevo.tipoId || !nuevo.monto) return
    
    setListaGastos([...listaGastos, { ...nuevo, id: Date.now() }])
    
    // Resetear formulario
    setNuevo({ 
      tipoId: '', 
      tipoNombre: '', 
      numeroDocumento: '', 
      proveedor: '', 
      monto: '',
      observaciones: '' 
    })
  }

  const eliminarGasto = (id) => {
    setListaGastos(listaGastos.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaGastos)
    onClose()
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Gastos Autorizados">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-12 gap-4 items-end">
            
            {/* Tipo Gasto */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Tipo {cargando && <span className="text-gray-400 font-normal">...</span>}
              </label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={nuevo.tipoId}
                onChange={handleTipoChange}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                {tiposVale.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* N° Doc */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">N° Doc</label>
              <input 
                type="text" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Fac/Bol"
                value={nuevo.numeroDocumento}
                onChange={e => handleInputChange('numeroDocumento', e.target.value)}
              />
            </div>

            {/* Proveedor / Beneficiario */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Proveedor / Beneficiario</label>
              <input 
                type="text" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Nombre o Razón Social"
                value={nuevo.proveedor}
                onChange={e => handleInputChange('proveedor', e.target.value)}
              />
            </div>

            {/* Monto */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold"
                placeholder="0.00"
                value={nuevo.monto}
                onChange={e => handleInputChange('monto', e.target.value)}
              />
            </div>
            
            {/* Botón Agregar */}
            <div className="col-span-1 flex justify-end">
              <button 
                onClick={agregarGasto}
                className="h-10 w-10 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                disabled={!nuevo.tipoId || !nuevo.monto}
              >
                <PlusCircle className="w-6 h-6" />
              </button>
            </div>
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

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doc.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaGastos.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {item.tipoNombre}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {item.numeroDocumento || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                    {item.proveedor || '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    S/ {parseFloat(item.monto).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => eliminarGasto(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaGastos.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay gastos registrados
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
