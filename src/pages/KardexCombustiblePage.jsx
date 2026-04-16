import { useState, useEffect, useCallback } from 'react'
import { ClipboardList } from 'lucide-react'
import { getProductosCombustibleKardex, getKardexCombustible } from '../utils/api'

function fmtNum(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

export default function KardexCombustiblePage() {
  const [productos, setProductos] = useState([])
  const [productoId, setProductoId] = useState('')
  const [desde, setDesde] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const list = await getProductosCombustibleKardex()
        if (!cancel) setProductos(Array.isArray(list) ? list : [])
      } catch {
        if (!cancel) setProductos([])
      }
    })()
    return () => {
      cancel = true
    }
  }, [])

  const consultar = useCallback(async () => {
    setError('')
    setData(null)
    if (!productoId) {
      setError('Seleccione un combustible (producto)')
      return
    }
    setLoading(true)
    try {
      const res = await getKardexCombustible({
        producto_id: parseInt(productoId, 10),
        desde,
        hasta,
      })
      setData(res)
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Error al consultar'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }, [productoId, desde, hasta])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
          <ClipboardList className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kardex por combustible</h1>
          <p className="text-sm text-gray-600">
            Saldo al inicio del periodo y movimientos de entrada y salida según el historial de stock.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Combustible (producto)</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
            >
              <option value="">— Seleccione —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                  {p.subcategoria ? ` (${p.subcategoria})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={consultar}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {data && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              {data.producto?.codigo} — {data.producto?.nombre}
              {data.producto?.subcategoria ? ` · ${data.producto.subcategoria}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Periodo: {data.periodo_desde} al {data.periodo_hasta}
              {data.producto?.unidad_abreviatura
                ? ` · Unidad: ${data.producto.unidad_abreviatura}`
                : ''}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Saldo inicial (al inicio del día «desde»): <strong>{fmtNum(data.saldo_inicial)}</strong>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="px-3 py-2 whitespace-nowrap">Fecha / hora</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Concepto</th>
                  <th className="px-3 py-2 text-right">Entrada (+)</th>
                  <th className="px-3 py-2 text-right">Salida (−)</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(data.lineas || []).map((row, idx) => (
                  <tr
                    key={`${row.movimiento_id ?? 'open'}-${idx}`}
                    className={`border-b border-gray-100 ${row.tipo === 'saldo_inicial' ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{fmtDateTime(row.fecha_hora)}</td>
                    <td className="px-3 py-2 text-gray-600">{row.tipo}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={row.concepto || ''}>
                      {row.concepto || '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{fmtNum(row.entrada)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{fmtNum(row.salida)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">{fmtNum(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
