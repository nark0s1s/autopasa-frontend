import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { getClientes } from '../../../utils/api'

function montoDescuentoDe(descuento) {
  const mv = parseFloat(descuento?.monto_venta || 0)
  const pct = parseFloat(descuento?.porcentaje_descuento || 0)
  return (mv * pct) / 100
}

export function ModalDescuentoTurno({ onClose, onSubmit, descuentoInicial = null }) {
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSel, setClienteSel] = useState(null)
  const [numeroDocumentoReferencia, setNumeroDocumentoReferencia] = useState('')
  const [montoDescuento, setMontoDescuento] = useState('')

  useEffect(() => {
    let cancelled = false
    setCargando(true)
    getClientes(true)
      .then((data) => {
        if (!cancelled) setClientesDisponibles(data || [])
      })
      .catch(() => {
        if (!cancelled) setClientesDisponibles([])
      })
      .finally(() => {
        if (!cancelled) setCargando(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!descuentoInicial) {
      setClienteSel(null)
      setBusqueda('')
      setNumeroDocumentoReferencia('')
      setMontoDescuento('')
      return
    }

    setNumeroDocumentoReferencia(descuentoInicial.motivo ?? '')
    setMontoDescuento(montoDescuentoDe(descuentoInicial).toFixed(2))

    if (descuentoInicial.cliente_id != null) {
      const cl = clientesDisponibles.find((c) => c.id === descuentoInicial.cliente_id)
      if (cl) {
        setClienteSel(cl)
        setBusqueda(cl.razon_social || '')
      } else {
        setClienteSel(null)
        setBusqueda('')
      }
    } else {
      setClienteSel(null)
      setBusqueda('')
    }
  }, [descuentoInicial, clientesDisponibles])

  const resultados = (() => {
    if (busqueda.trim() === '') return clientesDisponibles.slice(0, 60)
    const q = busqueda.toLowerCase()
    return clientesDisponibles
      .filter(
        (c) =>
          c.razon_social?.toLowerCase().includes(q) ||
          String(c.numero_documento || '').toLowerCase().includes(q)
      )
      .slice(0, 60)
  })()

  const seleccionarCliente = (c) => {
    setClienteSel(c)
    setBusqueda(c.razon_social || '')
    setMostrandoResultados(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const md = parseFloat(montoDescuento)
    if (Number.isNaN(md) || md <= 0) return
    const ref = (numeroDocumentoReferencia || '').trim()
    // La tabla del turno exige monto_venta y %; guardamos el monto ingresado como venta al 100 % para que el descuento calculado coincida con el monto.
    onSubmit({
      cliente_id: clienteSel?.id ?? null,
      monto_venta: md,
      porcentaje_descuento: 100,
      motivo: ref || null,
    })
  }

  const titulo = descuentoInicial ? 'Editar descuento (turno grifero)' : 'Nuevo descuento (turno grifero)'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{titulo}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Solo el monto de descuento es obligatorio. Cliente y documento de referencia son opcionales.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              N° documento de referencia <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ej. factura, nota de crédito…"
              value={numeroDocumentoReferencia}
              onChange={(e) => setNumeroDocumentoReferencia(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              Cliente <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className="input pr-9"
                placeholder="Buscar por razón social o documento…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  if (!e.target.value) setClienteSel(null)
                }}
                onFocus={() => setMostrandoResultados(true)}
                onBlur={() => setTimeout(() => setMostrandoResultados(false), 200)}
                disabled={cargando}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {mostrandoResultados && resultados.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => seleccionarCliente(c)}
                  >
                    <span className="font-medium">{c.razon_social}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {c.tipo_documento} {c.numero_documento}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {cargando && <p className="text-xs text-gray-500 mt-1">Cargando clientes…</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Monto descuento (S/) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input font-semibold text-red-700"
              value={montoDescuento}
              onChange={(e) => setMontoDescuento(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {descuentoInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
