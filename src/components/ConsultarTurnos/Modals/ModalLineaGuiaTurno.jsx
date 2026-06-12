import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { getClientes } from '../../../utils/api'

export function ModalLineaGuiaTurno({
  title,
  lineaInicial,
  numerosDocumentoOcupados = [],
  onClose,
  onSubmit,
}) {
  const [clientesDisponibles, setClientesDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [mostrandoResultados, setMostrandoResultados] = useState(false)
  const [clienteSel, setClienteSel] = useState(null)
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [monto, setMonto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [errorDoc, setErrorDoc] = useState('')

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
    if (!lineaInicial) {
      setBusqueda('')
      setClienteSel(null)
      setNumeroDocumento('')
      setMonto('')
      setObservaciones('')
      setErrorDoc('')
      return
    }
    const cid = lineaInicial.cliente_id
    const cl = clientesDisponibles.find((c) => c.id === cid)
    if (cl) {
      setClienteSel(cl)
      setBusqueda(cl.razon_social || '')
    } else {
      setClienteSel(null)
      setBusqueda(cid ? `Cliente #${cid}` : '')
    }
    setNumeroDocumento(lineaInicial.numero_documento ?? '')
    setMonto(lineaInicial.monto != null ? String(lineaInicial.monto) : '')
    setObservaciones(lineaInicial.observaciones ?? '')
  }, [lineaInicial, clientesDisponibles])

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
    const m = parseFloat(monto)
    const doc = numeroDocumento.trim()
    if (Number.isNaN(m) || m <= 0 || !doc) return
    const docNorm = doc.toLowerCase()
    if (numerosDocumentoOcupados.includes(docNorm)) {
      setErrorDoc('Este número de documento ya está registrado en otra guía de este turno')
      return
    }
    setErrorDoc('')
    onSubmit({
      cliente_id: clienteSel?.id ?? null,
      monto: m,
      numero_documento: doc,
      fecha_vencimiento: null,
      pagado: false,
      observaciones: observaciones.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Monto (S/) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              N° documento <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              className={`input ${errorDoc ? 'border-red-500' : ''}`}
              value={numeroDocumento}
              onChange={(e) => {
                setNumeroDocumento(e.target.value)
                if (errorDoc) setErrorDoc('')
              }}
              required
            />
            {errorDoc ? <p className="text-xs text-red-600 mt-1">{errorDoc}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea className="input min-h-[72px]" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {lineaInicial ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
