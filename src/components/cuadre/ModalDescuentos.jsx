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

export default function ModalDescuentos({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaDescuentos, setListaDescuentos] = useState(listaInicial)

  // Autocomplete clientes
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  // Campos del descuento
  const [campos, setCampos] = useState({
    montoVenta: '',
    porcentaje: '',
    montoDescuento: '',
    lastEdited: null
  })

  useEffect(() => {
    if (isOpen) {
      setListaDescuentos(listaInicial)
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
    }
  }, [isOpen])

  // Filtro client-side tipo LIKE "%busqueda%"
  useEffect(() => {
    if (busqueda.trim() === '') {
      setResultados(clientesDisponibles)
    } else {
      const q = busqueda.toLowerCase()
      setResultados(clientesDisponibles.filter(c => c.razon_social?.toLowerCase().includes(q)))
    }
  }, [busqueda, clientesDisponibles])

  // Cálculo bidireccional porcentaje ↔ monto descuento
  useEffect(() => {
    const venta = parseFloat(campos.montoVenta)
    if (isNaN(venta) || venta <= 0) return

    if (campos.lastEdited === 'porcentaje') {
      const pct = parseFloat(campos.porcentaje)
      if (!isNaN(pct)) {
        setCampos(prev => ({ ...prev, montoDescuento: ((venta * pct) / 100).toFixed(2), lastEdited: null }))
      }
    } else if (campos.lastEdited === 'montoDescuento') {
      const desc = parseFloat(campos.montoDescuento)
      if (!isNaN(desc)) {
        setCampos(prev => ({ ...prev, porcentaje: ((desc / venta) * 100).toFixed(2), lastEdited: null }))
      }
    }
  }, [campos.porcentaje, campos.montoDescuento, campos.montoVenta, campos.lastEdited])

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusqueda(cliente.razon_social)
    setMostrandoResultados(false)
  }

  const limpiarCliente = () => {
    setClienteSeleccionado(null)
    setBusqueda('')
  }

  const handleCampoChange = (field, value) => {
    setCampos(prev => ({
      ...prev,
      [field]: value,
      lastEdited: (field === 'porcentaje' || field === 'montoDescuento') ? field : prev.lastEdited
    }))
  }

  const agregarDescuento = () => {
    if (!clienteSeleccionado || !campos.montoDescuento) return
    setListaDescuentos([...listaDescuentos, {
      id: Date.now(),
      clienteId: clienteSeleccionado.id,
      nombre: clienteSeleccionado.razon_social,
      documento: clienteSeleccionado.numero_documento,
      montoVenta: campos.montoVenta,
      porcentaje: campos.porcentaje,
      montoDescuento: campos.montoDescuento
    }])
    limpiarCliente()
    setCampos({ montoVenta: '', porcentaje: '', montoDescuento: '', lastEdited: null })
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
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
          <div className="grid grid-cols-12 gap-3 items-end">

            {/* Búsqueda de cliente por razón social */}
            <div className="col-span-4 relative">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Cliente {cargando && <span className="text-gray-400 font-normal">cargando...</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full h-10 pl-3 pr-9 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Buscar por razón social..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); if (!e.target.value) limpiarCliente() }}
                  onFocus={() => setMostrandoResultados(true)}
                  onBlur={() => setTimeout(() => setMostrandoResultados(false), 200)}
                  disabled={cargando}
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
              </div>

              {/* Lista flotante */}
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

            {/* Monto Venta */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto Venta</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                placeholder="0.00"
                value={campos.montoVenta}
                onChange={e => handleCampoChange('montoVenta', e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>

            {/* Porcentaje */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">%</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                placeholder="%"
                value={campos.porcentaje}
                onChange={e => handleCampoChange('porcentaje', e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>

            {/* Monto Descuento */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto Desc.</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-red-600"
                placeholder="0.00"
                value={campos.montoDescuento}
                onChange={e => handleCampoChange('montoDescuento', e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>

            {/* Botón Agregar */}
            <div className="col-span-1 flex justify-end">
              <button
                onClick={agregarDescuento}
                className="h-10 w-10 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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
                    <div className="text-xs text-gray-400">{item.documento}</div>
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    S/ {parseFloat(item.montoVenta || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    {item.porcentaje}%
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-red-600">
                    S/ {parseFloat(item.montoDescuento).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => eliminarDescuento(item.id)} className="text-red-500 hover:text-red-700">
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
