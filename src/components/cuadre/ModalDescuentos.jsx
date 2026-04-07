import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X, Search } from 'lucide-react'
import { getClientes } from '../../utils/api'

function ModalWrapper({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default function ModalDescuentos({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaDescuentos, setListaDescuentos] = useState(listaInicial)
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargandoClientes, setCargandoClientes] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  const [nuevo, setNuevo] = useState({
    montoVenta: '',
    porcentaje: '',
    montoDescuento: '',
  })

  useEffect(() => {
    if (!isOpen) return
    setListaDescuentos(listaInicial)
    setBusqueda('')
    setClienteSeleccionado(null)
    setMostrandoResultados(false)
    setNuevo({ montoVenta: '', porcentaje: '', montoDescuento: '' })

    let cancelled = false
    const fetchClientes = async () => {
      setCargandoClientes(true)
      try {
        const data = await getClientes(true)
        if (!cancelled) setClientesDisponibles(data || [])
      } catch {
        if (!cancelled) setClientesDisponibles([])
      } finally {
        if (!cancelled) setCargandoClientes(false)
      }
    }
    fetchClientes()
    return () => {
      cancelled = true
    }
  }, [isOpen, listaInicial])

  const resultados = (() => {
    if (busqueda.trim() === '') return clientesDisponibles.slice(0, 80)
    const q = busqueda.toLowerCase()
    return clientesDisponibles
      .filter(
        (c) =>
          c.razon_social?.toLowerCase().includes(q) ||
          String(c.numero_documento || '').toLowerCase().includes(q)
      )
      .slice(0, 80)
  })()

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusqueda(cliente.razon_social || '')
    setMostrandoResultados(false)
  }

  const limpiarCliente = () => {
    setClienteSeleccionado(null)
    setBusqueda('')
  }

  const handleMontoVentaChange = (value) => {
    setNuevo((prev) => {
      const venta = parseFloat(value)
      const next = { ...prev, montoVenta: value }
      const pct = parseFloat(prev.porcentaje)
      if (!Number.isNaN(venta) && venta > 0 && !Number.isNaN(pct)) {
        next.montoDescuento = ((venta * pct) / 100).toFixed(2)
      }
      return next
    })
  }

  const onChangePorcentaje = (value) => {
    setNuevo((prev) => {
      const venta = parseFloat(prev.montoVenta)
      const next = { ...prev, porcentaje: value }
      const pct = parseFloat(value)
      if (!Number.isNaN(venta) && venta > 0 && !Number.isNaN(pct)) {
        next.montoDescuento = ((venta * pct) / 100).toFixed(2)
      }
      return next
    })
  }

  const onChangeMontoDescuento = (value) => {
    setNuevo((prev) => {
      const venta = parseFloat(prev.montoVenta)
      const next = { ...prev, montoDescuento: value }
      const desc = parseFloat(value)
      if (!Number.isNaN(venta) && venta > 0 && !Number.isNaN(desc)) {
        next.porcentaje = ((desc / venta) * 100).toFixed(2)
      }
      return next
    })
  }

  const agregarDescuento = () => {
    if (!clienteSeleccionado) return
    const venta = parseFloat(nuevo.montoVenta)
    if (Number.isNaN(venta) || venta <= 0) return

    let pct = parseFloat(nuevo.porcentaje)
    let desc = parseFloat(nuevo.montoDescuento)
    if (Number.isNaN(desc) || desc <= 0) {
      if (!Number.isNaN(pct) && pct > 0) {
        desc = (venta * pct) / 100
      } else {
        return
      }
    }
    if (Number.isNaN(pct) || pct <= 0) {
      pct = (desc / venta) * 100
    }

    setListaDescuentos([
      ...listaDescuentos,
      {
        id: Date.now(),
        clienteId: clienteSeleccionado.id,
        nombre: clienteSeleccionado.razon_social,
        documento: clienteSeleccionado.numero_documento,
        montoVenta: String(venta),
        porcentaje: String(parseFloat(pct.toFixed(2))),
        porcentajeDescuento: String(parseFloat(pct.toFixed(2))),
        montoDescuento: String(parseFloat(desc.toFixed(2))),
      },
    ])
    limpiarCliente()
    setNuevo({ montoVenta: '', porcentaje: '', montoDescuento: '' })
  }

  const eliminarDescuento = (id) => {
    setListaDescuentos(listaDescuentos.filter((c) => c.id !== id))
  }

  const handleSave = () => {
    onSave(listaDescuentos)
    onClose()
  }

  const totalDescuentos = listaDescuentos.reduce(
    (acc, curr) => acc + parseFloat(curr.montoDescuento || 0),
    0
  )

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Descuentos aplicados">
      <div className="space-y-6">
        <p className="text-sm text-gray-500 -mt-1">
          Los ítems de esta lista se persisten al pulsar <strong>Guardar cuadre</strong> en la pantalla principal
          (detalle de descuentos aplicados del día).
        </p>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
              Cliente
              {cargandoClientes && (
                <span className="text-gray-400 font-normal normal-case ml-2">cargando…</span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full h-10 pl-3 pr-9 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="Razón social o documento…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  if (!e.target.value) limpiarCliente()
                }}
                onFocus={() => setMostrandoResultados(true)}
                onBlur={() => setTimeout(() => setMostrandoResultados(false), 200)}
                disabled={cargandoClientes}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {mostrandoResultados && resultados.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => seleccionarCliente(c)}
                  >
                    <span className="font-medium">{c.razon_social}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {c.tipo_documento}: {c.numero_documento}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Monto venta (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full h-10 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-semibold"
                placeholder="0.00"
                value={nuevo.montoVenta}
                onChange={(e) => handleMontoVentaChange(e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">% desc.</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full h-10 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center"
                placeholder="%"
                value={nuevo.porcentaje}
                onChange={(e) => onChangePorcentaje(e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">
                Monto desc. (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full h-10 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-red-600"
                placeholder="0.00"
                value={nuevo.montoDescuento}
                onChange={(e) => onChangeMontoDescuento(e.target.value)}
                disabled={!clienteSeleccionado}
              />
            </div>
            <div className="sm:col-span-1 flex justify-end sm:justify-center">
              <button
                type="button"
                onClick={agregarDescuento}
                className="h-10 w-10 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-sm"
                title="Agregar a la lista"
              >
                <PlusCircle className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">N°</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Venta</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Desc.</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaDescuentos.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-center text-sm text-gray-500 font-medium">{index + 1}</td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                    <div className="text-xs text-gray-400">{item.documento}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                    S/ {parseFloat(item.montoVenta || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-600">
                    {parseFloat(item.porcentaje || item.porcentajeDescuento || 0).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-red-600">
                    S/ {parseFloat(item.montoDescuento || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => eliminarDescuento(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaDescuentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    No hay descuentos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {listaDescuentos.length > 0 && (
          <div className="flex justify-end text-sm text-gray-700">
            <span className="font-medium">Total descuentos:</span>
            <span className="ml-2 font-bold text-red-600">S/ {totalDescuentos.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button
            type="button"
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
