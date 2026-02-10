import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getEmpleados } from '../../utils/api'

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

export default function ModalDeposito({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaDepositos, setListaDepositos] = useState(listaInicial)
  const [nuevo, setNuevo] = useState({ 
    numeroComprobante: '', 
    recibidoPor: '', 
    monto: '',
    observaciones: '' 
  })
  
  // Lista mock de empleados (se reemplazará por llamada a API)
  const empleadosMock = [
    { id: 1, nombre: 'JUAN PEREZ' },
    { id: 2, nombre: 'MARIA GOMEZ' },
    { id: 3, nombre: 'CARLOS LOPEZ' },
    { id: 4, nombre: 'ANA MARTINEZ' }
  ]
  const [empleados, setEmpleados] = useState(empleadosMock)
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false)

  // Cargar empleados desde API
  useEffect(() => {
    const fetchEmpleados = async () => {
      if (isOpen) {
        setCargandoEmpleados(true)
        try {
          const data = await getEmpleados()
          if (data && data.length > 0) {
            setEmpleados(data)
          } else {
            setEmpleados(empleadosMock) // Fallback si array vacío
          }
        } catch (error) {
          console.warn("Error al cargar empleados (usando mock):", error)
          setEmpleados(empleadosMock)
        } finally {
          setCargandoEmpleados(false)
        }
      }
    }
    
    fetchEmpleados()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setListaDepositos(listaInicial)
    }
  }, [isOpen, listaInicial])

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarDeposito = () => {
    if (!nuevo.numeroComprobante || !nuevo.recibidoPor || !nuevo.monto) return
    
    // Encontrar el nombre del empleado seleccionado para mostrar en la tabla (opcional)
    // o simplemente guardar el valor seleccionado.
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
            
            {/* N° Comprobante */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">N° Comprobante</label>
              <input 
                type="text" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="000-000"
                value={nuevo.numeroComprobante}
                onChange={e => handleInputChange('numeroComprobante', e.target.value)}
              />
            </div>

            {/* Recibido Por */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Recibido Por {cargandoEmpleados && <span className="text-gray-400 font-normal">(Cargando...)</span>}
              </label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={nuevo.recibidoPor}
                onChange={e => handleInputChange('recibidoPor', e.target.value)}
                disabled={cargandoEmpleados}
              >
                <option value="">Seleccione Empleado</option>
                {empleados.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombres} {emp.apellidos || ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div className="w-1/4">
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
            <button 
              onClick={agregarDeposito}
              className="h-10 w-12 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">N° Comprobante</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibido Por</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaDepositos.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {item.numeroComprobante}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {item.recibidoPor}
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
                  <td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500">
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
