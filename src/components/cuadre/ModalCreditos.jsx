import { useState, useEffect } from 'react'
import { Search, Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getClienteByDocumento } from '../../utils/api'

// Componente Modal Genérico (reutilizado o importado si moves Layout)
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

export default function ModalCreditos({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaCreditos, setListaCreditos] = useState(listaInicial)
  const [nuevoCredito, setNuevoCredito] = useState({ 
    documento: '', 
    monto: '', 
    nombre: '',
    fechaVencimiento: new Date().toISOString().split('T')[0] // Default: hoy
  })
  const [buscandoCliente, setBuscandoCliente] = useState(false)

  // Sincronizar estado si la prop cambia (opcional, depende de si queremos persistencia al cerrar)
  useEffect(() => {
    if (isOpen) {
      setListaCreditos(listaInicial)
    }
  }, [isOpen, listaInicial])

  const buscarCliente = async () => {
    if (!nuevoCredito.documento) return
    setBuscandoCliente(true)
    try {
      const cliente = await getClienteByDocumento(nuevoCredito.documento)
      if (cliente) {
        setNuevoCredito(prev => ({ 
          ...prev, 
          nombre: cliente.razon_social || cliente.nombre_comercial,
          clienteId: cliente.id 
        }))
      } else {
        alert("Cliente no encontrado o no tiene crédito autorizado")
        setNuevoCredito(prev => ({ ...prev, nombre: '' }))
      }
    } catch (error) {
      console.error("Error buscando cliente:", error)
      alert("Error al buscar cliente")
    } finally {
      setBuscandoCliente(false)
    }
  }

  const agregarCredito = () => {
    if (!nuevoCredito.documento || !nuevoCredito.monto || !nuevoCredito.nombre || !nuevoCredito.fechaVencimiento) return
    setListaCreditos([...listaCreditos, { ...nuevoCredito, id: Date.now() }])
    setNuevoCredito({ 
      documento: '', 
      monto: '', 
      nombre: '',
      fechaVencimiento: new Date().toISOString().split('T')[0]
    })
  }

  const eliminarCredito = (id) => {
    setListaCreditos(listaCreditos.filter(c => c.id !== id))
  }
  
  const handleSave = () => {
    onSave(listaCreditos)
    onClose()
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Créditos">
      <div className="space-y-6">
        {/* Formulario de Agregado */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Cliente (Doc)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="N° Documento"
                  className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={nuevoCredito.documento}
                  onChange={e => setNuevoCredito({...nuevoCredito, documento: e.target.value.replace(/\D/g, '')})} 
                />
                <button 
                  onClick={buscarCliente}
                  disabled={buscandoCliente}
                  className="h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="w-48">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Fecha Vencimiento</label>
              <input 
                type="date" 
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={nuevoCredito.fechaVencimiento}
                onChange={e => setNuevoCredito({...nuevoCredito, fechaVencimiento: e.target.value})} 
              />
            </div>
            
            <div className="w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Monto</label>
              <input 
                type="number" 
                placeholder="0.00"
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={nuevoCredito.monto}
                onChange={e => setNuevoCredito({...nuevoCredito, monto: e.target.value})} 
              />
            </div>
            
            <button 
              onClick={agregarCredito}
              className="h-10 w-10 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
          {nuevoCredito.nombre && (
            <div className="text-sm text-gray-600 font-medium bg-white p-2 rounded border border-gray-200">
              {nuevoCredito.nombre}
            </div>
          )}
        </div>

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaCreditos.map((credito) => (
                <tr key={credito.id}>
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium text-gray-900">{credito.nombre}</div>
                    <div className="text-xs text-gray-500">{credito.documento}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {credito.fechaVencimiento}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    S/ {parseFloat(credito.monto).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => eliminarCredito(credito.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaCreditos.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay créditos agregados
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
