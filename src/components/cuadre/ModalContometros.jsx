import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getContometros } from '../../utils/api'

// Componente Modal Genérico
function ModalWrapper({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 overflow-hidden">
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

export default function ModalContometros({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaContometros, setListaContometros] = useState(listaInicial)
  // Estado para contometros
  const [contometrosDisponibles, setContometrosDisponibles] = useState([])
  const [cargando, setCargando] = useState(false)
  
  const [nuevo, setNuevo] = useState({ 
    contometroId: '', 
    codigo: '', 
    producto: '', 
    lecturaInicial: '', 
    lecturaFinal: '', 
    galones: '', 
    precio: '', 
    monto: '' 
  })
  
  // Mock de Contómetros (Fallback)
  const contometrosMock = [
    { id: 1, codigo: 'MANG-01', producto: 'GASOLINA 90', lectura_actual: 14500.50, precio: 15.50 },
    { id: 2, codigo: 'MANG-02', producto: 'GASOLINA 90', lectura_actual: 12300.20, precio: 15.50 },
    { id: 3, codigo: 'MANG-03', producto: 'GASOLINA 95', lectura_actual: 8900.00, precio: 17.20 },
    { id: 4, codigo: 'MANG-04', producto: 'GLP', lectura_actual: 25600.80, precio: 8.50 },
    { id: 5, codigo: 'MANG-05', producto: 'DIESEL', lectura_actual: 34200.10, precio: 16.00 },
  ]

  // Cargar contómetros desde API
  useEffect(() => {
    const fetchContometros = async () => {
      if (isOpen) {
        setCargando(true)
        try {
          const data = await getContometros()
          if (data && data.length > 0) {
            const contometrosMapeados = data.map(c => ({
              id: c.id,
              codigo: c.codigo,
              producto: c.producto?.nombre || 'Sin Producto',
              lectura_actual: parseFloat(c.lectura_actual).toFixed(2), 
              precio: parseFloat(c.producto?.precio_venta).toFixed(2)
            }))
            setContometrosDisponibles(contometrosMapeados)
          } else {
            setContometrosDisponibles(contometrosMock)
          }
        } catch (error) {
          console.warn("Error al cargar contómetros (usando mock):", error)
          setContometrosDisponibles(contometrosMock)
        } finally {
          setCargando(false)
        }
      }
    }
    
    fetchContometros()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setListaContometros(listaInicial)
    }
  }, [isOpen, listaInicial])

  // Cálculo Automático
  useEffect(() => {
    const lecturaInicial = parseFloat(nuevo.lecturaInicial)
    const lecturaFinal = parseFloat(nuevo.lecturaFinal)
    const precio = parseFloat(nuevo.precio)

    if (
      !isNaN(lecturaInicial) && 
      !isNaN(lecturaFinal) && 
      !isNaN(precio) && 
      lecturaFinal >= lecturaInicial
    ) {
      const galones = lecturaFinal - lecturaInicial
      const monto = galones * precio
      setNuevo(prev => ({ 
        ...prev, 
        galones: galones.toFixed(2), 
        monto: monto.toFixed(2) 
      }))
    } else {
      setNuevo(prev => ({ ...prev, galones: '', monto: '' }))
    }
  }, [nuevo.lecturaFinal, nuevo.lecturaInicial, nuevo.precio])

  const handleContometroChange = (e) => {
    const selectedId = parseInt(e.target.value)
    const selected = contometrosDisponibles.find(c => c.id === selectedId)
    
    if (selected) {
      // Adaptar si viene del backend (donde producto es un objeto anidado o ID)
      // Asumiremos que el backend devuelve algo como { id, codigo, producto: { nombre: '...' }, lectura_actual: ... }
      // O usaremos el mock si no coincide.
      
      const nombreProducto = selected.producto?.nombre || selected.producto || 'Producto'
      const lecturaActual = selected.lectura_actual || selected.lecturaActual || 0
      
      setNuevo(prev => ({
        ...prev,
        contometroId: selected.id,
        codigo: selected.codigo,
        producto: nombreProducto,
        lecturaInicial: lecturaActual, // Auto-llenar lectura inicial con la actual del sistema
        lecturaFinal: '', 
        galones: '',
        precio: selected.precio, // El precio ya viene formateado
        monto: ''
      }))
    } else {
       setNuevo({ contometroId: '', codigo: '', producto: '', lecturaInicial: '', lecturaFinal: '', galones: '', precio: '', monto: '' })
    }
  }

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarContometro = () => {
    if (!nuevo.contometroId || !nuevo.lecturaFinal || !nuevo.monto) return
    
    setListaContometros([...listaContometros, { ...nuevo, id: Date.now() }])
    
    // Resetear formulario parcial (mantener ID vacío o lo que prefieras)
    setNuevo({ contometroId: '', codigo: '', producto: '', lecturaInicial: '', lecturaFinal: '', galones: '', precio: '', monto: '' })
  }

  const eliminarContometro = (id) => {
    setListaContometros(listaContometros.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaContometros)
    onClose()
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Contómetros">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex gap-4 items-end">
            
            {/* Contómetro Selector */}
            <div className="w-64">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Contómetro {cargando && <span className="text-gray-400 font-normal">...</span>}
              </label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={nuevo.contometroId}
                onChange={handleContometroChange}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                {contometrosDisponibles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} - {c.producto?.nombre || c.producto}
                  </option>
                ))}
              </select>
            </div>

            {/* Actual Lectura */}
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Lect. Actual</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 text-gray-600 text-center"
                readOnly
                value={nuevo.lecturaInicial}
              />
            </div>

            {/* Nueva Lectura */}
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Nueva Lect.</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-blue-600"
                placeholder="0.00"
                value={nuevo.lecturaFinal}
                onChange={e => handleInputChange('lecturaFinal', e.target.value)}
              />
            </div>

            {/* Precio Unit */}
            <div className="w-24">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">P. Unit</label>
              <input 
                type="number" 
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 text-gray-600 text-center"
                readOnly
                value={nuevo.precio}
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
              onClick={agregarContometro}
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contómetro</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lect. Actual</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lect. Nueva</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Dif.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Final</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaContometros.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {item.codigo}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-500">
                    {item.lecturaInicial}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900 font-bold">
                    {item.lecturaFinal}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-blue-600 font-medium">
                    {item.galones}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-green-600">
                    S/ {item.monto}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => eliminarContometro(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaContometros.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay lecturas registradas
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
