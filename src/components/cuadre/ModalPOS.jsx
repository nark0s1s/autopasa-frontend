import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getTerminales } from '../../utils/api'

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

export default function ModalPOS({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaPOS, setListaPOS] = useState(listaInicial)
  const [nuevo, setNuevo] = useState({ 
    terminalId: '', 
    tipoTarjeta: 'CREDITO', 
    numeroOperacion: '', 
    numeroLote: '', 
    monto: '' 
  })
  
  const [terminales, setTerminales] = useState([])
  const [cargando, setCargando] = useState(false)

  // Cargar terminales desde API
  useEffect(() => {
    const fetchTerminales = async () => {
      if (isOpen) {
        setCargando(true)
        try {
          const data = await getTerminales()
          if (data) {
            setTerminales(data)
          }
        } catch (error) {
          console.error("Error cargando terminales:", error)
        } finally {
          setCargando(false)
        }
      }
    }
    fetchTerminales()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setListaPOS(listaInicial)
    }
  }, [isOpen, listaInicial])

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarTransaccion = () => {
    if (!nuevo.terminalId || !nuevo.numeroOperacion || !nuevo.monto) return
    
    // Encontrar nombre del terminal para mostrar
    const terminalObj = terminales.find(t => t.id.toString() === nuevo.terminalId) // Usamos ID
    const terminalNombre = terminalObj ? terminalObj.nombre : nuevo.terminalId

    setListaPOS([...listaPOS, { 
      ...nuevo, 
      id: Date.now(),
      terminalNombre 
    }])
    
    // Resetear formulario (manteniendo terminal y tarjeta para agilizar)
    setNuevo(prev => ({ 
      ...prev, 
      numeroOperacion: '', 
      monto: '' 
    }))
  }

  const eliminarTransaccion = (id) => {
    setListaPOS(listaPOS.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaPOS)
    onClose()
  }

  const totalPOS = listaPOS.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0)

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Tarjetas (POS)">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Terminal */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Terminal</label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={nuevo.terminalId}
                onChange={e => handleInputChange('terminalId', e.target.value)}
              >
                <option value="">Seleccione...</option>
                {terminales.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* Tipo Tarjeta */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tipo</label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={nuevo.tipoTarjeta}
                onChange={e => handleInputChange('tipoTarjeta', e.target.value)}
              >
                <option value="CREDITO">CRÉDITO</option>
                <option value="DEBITO">DÉBITO</option>
              </select>
            </div>

            {/* N° Lote (Opcional) */}
             <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Lote</label>
              <input 
                type="text" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="---"
                value={nuevo.numeroLote}
                onChange={e => handleInputChange('numeroLote', e.target.value)}
              />
            </div>

            {/* N° Operación */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">N° Oper.</label>
              <input 
                type="text" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="0000"
                value={nuevo.numeroOperacion}
                onChange={e => handleInputChange('numeroOperacion', e.target.value)}
              />
            </div>

            {/* Monto */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-gray-900"
                placeholder="0.00"
                value={nuevo.monto}
                onChange={e => handleInputChange('monto', e.target.value)}
              />
            </div>
            
            {/* Botón Agregar */}
            <div className="md:col-span-1 flex justify-end">
                <button 
                onClick={agregarTransaccion}
                className="h-10 w-full flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-sm"
                title="Agregar Transacción"
                >
                <PlusCircle className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Terminal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarj.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operación</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-2"></th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {listaPOS.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-sm text-gray-700 font-medium">
                        {item.terminalNombre}
                    </td>
                    <td className="px-4 py-2 text-xs">
                        <span className={`px-2 py-1 rounded-full font-semibold ${item.tipoTarjeta === 'CREDITO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.tipoTarjeta}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 font-mono">
                        {item.numeroLote || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-bold font-mono">
                        {item.numeroOperacion}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                        S/ {parseFloat(item.monto).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                        <button 
                        onClick={() => eliminarTransaccion(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50"
                        >
                        <Trash2 className="w-4 h-4" />
                        </button>
                    </td>
                    </tr>
                ))}
                {listaPOS.length === 0 && (
                    <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-sm text-gray-500">
                        No hay transacciones registradas
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar Todo
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
