import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X, Search } from 'lucide-react'
import { getClientes } from '../../utils/api'

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
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function ModalCreditos({ isOpen, onClose, onSave, listaInicial = [], fecha }) {
  const [listaCreditos, setListaCreditos] = useState(listaInicial)

  // Lista completa para autocomplete
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargando, setCargando] = useState(false)

  // Estado del form
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [monto, setMonto] = useState('')

  // Calcular fecha de vencimiento = fecha del cuadre + 30 días
  const calcularFechaVencimiento = () => {
    const base = fecha ? new Date(fecha + 'T00:00:00') : new Date()
    base.setDate(base.getDate() + 30)
    return base.toISOString().split('T')[0]
  }

  // Cargar todos los clientes al abrir
  useEffect(() => {
    if (!isOpen) return
    setListaCreditos(listaInicial)
    const fetchClientes = async () => {
      setCargando(true)
      try {
        const data = await getClientes(true)
        setClientesDisponibles(data || [])
      } catch (err) {
        console.warn('Error al cargar clientes:', err)
        setClientesDisponibles([])
      } finally {
        setCargando(false)
      }
    }
    fetchClientes()
  }, [isOpen])

  // Filtro client-side tipo LIKE "%busqueda%"
  useEffect(() => {
    if (busqueda.trim() === '') {
      setResultados(clientesDisponibles)
    } else {
      const q = busqueda.toLowerCase()
      setResultados(
        clientesDisponibles.filter(c =>
          c.razon_social?.toLowerCase().includes(q)
        )
      )
    }
  }, [busqueda, clientesDisponibles])

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusqueda(cliente.razon_social)
    setResultados([])
    setMostrandoResultados(false)
  }

  const limpiarSeleccion = () => {
    setClienteSeleccionado(null)
    setBusqueda('')
  }

  const agregarCredito = () => {
    if (!clienteSeleccionado || !monto) return
    const fechaVencimiento = calcularFechaVencimiento()
    setListaCreditos([
      ...listaCreditos,
      {
        id: Date.now(),
        clienteId: clienteSeleccionado.id,
        nombre: clienteSeleccionado.razon_social,
        documento: clienteSeleccionado.numero_documento,
        monto,
        fechaVencimiento
      }
    ])
    limpiarSeleccion()
    setMonto('')
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
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
          <div className="flex gap-3 items-end">

            {/* Buscador de Cliente por Razón Social */}
            <div className="flex-1 relative">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Cliente {cargando && <span className="text-gray-400 font-normal">cargando...</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full h-10 pl-3 pr-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Escriba razón social para buscar..."
                  value={busqueda}
                  onChange={e => {
                    setBusqueda(e.target.value)
                    if (!e.target.value) limpiarSeleccion()
                  }}
                  onFocus={() => setMostrandoResultados(true)}
                  onBlur={() => setTimeout(() => setMostrandoResultados(false), 200)}
                  disabled={cargando}
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
              </div>

              {/* Lista flotante de resultados */}
              {mostrandoResultados && resultados.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {resultados.map(c => (
                    <div
                      key={c.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                      onClick={() => seleccionarCliente(c)}
                    >
                      <span className="font-medium">{c.razon_social}</span>
                      <span className="ml-2 text-xs text-gray-400">{c.tipo_documento}: {c.numero_documento}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monto */}
            <div className="w-40">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Monto</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>

            {/* Botón Agregar */}
            <button
              onClick={agregarCredito}
              className="h-10 w-10 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaCreditos.map((credito) => (
                <tr key={credito.id}>
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium text-gray-900">{credito.nombre}</div>
                    <div className="text-xs text-gray-400">{credito.documento}</div>
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    S/ {parseFloat(credito.monto).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => eliminarCredito(credito.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaCreditos.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">
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
