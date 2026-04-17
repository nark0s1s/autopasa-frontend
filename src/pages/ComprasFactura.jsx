import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Plus, X, Trash2 } from 'lucide-react'
import {
  getComprasFactura,
  crearCompraFactura,
  getProveedores,
  getProductosAdmin,
  getMovimientosStock,
  crearAjusteStock,
} from '../utils/api'

function Notificacion({ notificacion, onClose }) {
  if (!notificacion) return null
  const esError = notificacion.tipo === 'error'
  return (
    <div
      className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${
        esError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
      }`}
    >
      <span>{esError ? '❌' : '✅'}</span>
      <div className="flex-1 text-sm whitespace-pre-line">{notificacion.mensaje}</div>
      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}

const lineaVacia = () => ({
  producto_id: '',
  cantidad: '',
  precio_unitario: '',
  descuento: '0',
  unidad_medida_id: '',
  lote: '',
})

function labelProveedor(p) {
  return `${p.numero_documento} — ${p.razon_social}`
}

function ModalCompra({ productos, onClose, onSave }) {
  const [proveedor_id, setProveedorId] = useState('')
  const [proveedorTexto, setProveedorTexto] = useState('')
  const [opcionesProveedor, setOpcionesProveedor] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [listaProvAbierta, setListaProvAbierta] = useState(false)
  const blurProvTimer = useRef(null)
  const [serie, setSerie] = useState('F001')
  const [numero, setNumero] = useState('')
  const [fecha_emision, setFechaEmision] = useState(() => new Date().toISOString().slice(0, 10))
  const [aplica_igv, setAplicaIgv] = useState(true)
  const [orden_compra, setOrdenCompra] = useState('')
  const [guia_remision, setGuiaRemision] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [lineas, setLineas] = useState([lineaVacia()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const q = proveedorTexto.trim()
      setProvLoading(true)
      try {
        const data = await getProveedores(true, {
          q: q.length ? q : undefined,
          limit: q.length ? 80 : 50,
        })
        if (!cancelled) setOpcionesProveedor(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setOpcionesProveedor([])
      } finally {
        if (!cancelled) setProvLoading(false)
      }
    }, 260)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (blurProvTimer.current) clearTimeout(blurProvTimer.current)
    }
  }, [proveedorTexto])

  const addLinea = () => setLineas((prev) => [...prev, lineaVacia()])
  const removeLinea = (idx) => setLineas((prev) => prev.filter((_, i) => i !== idx))
  const setLinea = (idx, field, value) => {
    setLineas((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!proveedor_id) {
      setError('Busque y elija un proveedor de la lista')
      return
    }
    const detalles = lineas
      .filter((l) => l.producto_id && l.cantidad && l.precio_unitario)
      .map((l) => ({
        producto_id: parseInt(l.producto_id, 10),
        cantidad: parseFloat(l.cantidad),
        precio_unitario: parseFloat(l.precio_unitario),
        descuento: parseFloat(l.descuento) || 0,
        unidad_medida_id: l.unidad_medida_id ? parseInt(l.unidad_medida_id, 10) : null,
        lote: l.lote || null,
        fecha_vencimiento: null,
      }))
    if (!detalles.length) {
      setError('Agregue al menos una línea con producto, cantidad y precio')
      return
    }
    setGuardando(true)
    try {
      await crearCompraFactura({
        proveedor_id: parseInt(proveedor_id, 10),
        tipo_comprobante: '01',
        serie,
        numero,
        fecha_emision,
        orden_compra: orden_compra || null,
        guia_remision: guia_remision || null,
        observaciones: observaciones || null,
        aplica_igv,
        detalles,
      })
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Error al registrar compra')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Registrar factura de compra</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="compra-proveedor-busqueda">
                Proveedor *
              </label>
              <input
                id="compra-proveedor-busqueda"
                type="search"
                autoComplete="off"
                value={proveedorTexto}
                onChange={(e) => {
                  setProveedorTexto(e.target.value)
                  setProveedorId('')
                  setListaProvAbierta(true)
                }}
                onFocus={() => {
                  if (blurProvTimer.current) clearTimeout(blurProvTimer.current)
                  setListaProvAbierta(true)
                }}
                onBlur={() => {
                  blurProvTimer.current = setTimeout(() => setListaProvAbierta(false), 200)
                }}
                placeholder="Escriba razón social o RUC…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              />
              {listaProvAbierta && (
                <ul
                  className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
                  role="listbox"
                >
                  {provLoading && (
                    <li className="px-3 py-2 text-gray-500" role="option">
                      Buscando…
                    </li>
                  )}
                  {!provLoading && opcionesProveedor.length === 0 && (
                    <li className="px-3 py-2 text-gray-500" role="option">
                      Sin coincidencias
                    </li>
                  )}
                  {!provLoading &&
                    opcionesProveedor.map((p) => (
                      <li key={p.id} role="option">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-gray-800"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => {
                            setProveedorId(String(p.id))
                            setProveedorTexto(labelProveedor(p))
                            setListaProvAbierta(false)
                          }}
                        >
                          <span className="font-medium">{p.razon_social}</span>
                          <span className="text-gray-500 text-xs block">{p.numero_documento}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Serie *</label>
              <input value={serie} onChange={(e) => setSerie(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Número *</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha emisión *</label>
              <input type="date" value={fecha_emision} onChange={(e) => setFechaEmision(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Orden compra</label>
              <input value={orden_compra} onChange={(e) => setOrdenCompra(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Guía remisión</label>
              <input value={guia_remision} onChange={(e) => setGuiaRemision(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" checked={aplica_igv} onChange={(e) => setAplicaIgv(e.target.checked)} /> Aplicar IGV 18% sobre subtotal
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Detalle</span>
              <button type="button" onClick={addLinea} className="text-sm text-indigo-600 font-medium">
                + Línea
              </button>
            </div>
            <div className="p-3 space-y-2">
              {lineas.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-2">
                  <div className="col-span-12 md:col-span-4">
                    <label className="text-xs text-gray-500">Producto</label>
                    <select
                      value={row.producto_id}
                      onChange={(e) => setLinea(idx, 'producto_id', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="">—</option>
                      {productos.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.codigo} {pr.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-xs text-gray-500">Cantidad</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={row.cantidad}
                      onChange={(e) => setLinea(idx, 'cantidad', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="text-xs text-gray-500">P. unit.</label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      value={row.precio_unitario}
                      onChange={(e) => setLinea(idx, 'precio_unitario', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <label className="text-xs text-gray-500">Desc.</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.descuento}
                      onChange={(e) => setLinea(idx, 'descuento', e.target.value)}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-1 flex justify-end pb-1">
                    <button type="button" onClick={() => removeLinea(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" disabled={lineas.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {guardando ? 'Registrando…' : 'Registrar e ingresar stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalAjuste({ productos, onClose, onSave }) {
  const [producto_id, setProductoId] = useState('')
  const [cantidad_delta, setCantidadDelta] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await crearAjusteStock({
        producto_id: parseInt(producto_id, 10),
        cantidad_delta: parseFloat(cantidad_delta),
        observaciones: observaciones || null,
      })
      onSave()
    } catch (e2) {
      setErr(typeof e2.response?.data?.detail === 'string' ? e2.response.data.detail : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Ajuste de stock</h3>
          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Producto *</label>
            <select value={producto_id} onChange={(e) => setProductoId(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">—</option>
              {productos.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.codigo} {pr.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Cantidad (+ entra, − sale)</label>
            <input type="number" step="0.0001" value={cantidad_delta} onChange={(e) => setCantidadDelta(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Motivo / observación</label>
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-xl text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-amber-600 text-white rounded-xl text-sm disabled:opacity-50">
              {loading ? '…' : 'Aplicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ComprasFactura() {
  const [compras, setCompras] = useState([])
  const [movs, setMovs] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('compras')
  const [modalCompra, setModalCompra] = useState(false)
  const [modalAjuste, setModalAjuste] = useState(false)
  const [notif, setNotif] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [c, m, pr, prod] = await Promise.all([
        getComprasFactura({ limit: 200 }),
        getMovimientosStock({ limit: 300 }),
        getProveedores(true),
        getProductosAdmin(null),
      ])
      setCompras(Array.isArray(c) ? c : [])
      setMovs(Array.isArray(m) ? m : [])
      setProveedores(Array.isArray(pr) ? pr : [])
      setProductos(Array.isArray(prod) ? prod : [])
    } catch {
      setNotif({ tipo: 'error', mensaje: 'Error al cargar datos' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const nombreProv = (id) => proveedores.find((p) => p.id === id)?.razon_social || `ID ${id}`

  return (
    <div className="p-6 space-y-6">
      <Notificacion notificacion={notif} onClose={() => setNotif(null)} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" size={28} />
            Compras y stock
          </h1>
          <p className="text-sm text-gray-400 mt-1">Facturas de proveedor ingresan inventario; movimientos registran trazabilidad</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalAjuste(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
          >
            Ajuste manual
          </button>
          <button
            type="button"
            onClick={() => setModalCompra(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus size={18} /> Nueva compra
          </button>
        </div>
      </div>
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('compras')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'compras' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}
        >
          Facturas
        </button>
        <button
          type="button"
          onClick={() => setTab('movs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'movs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}
        >
          Movimientos
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center text-gray-400">Cargando…</div>
        ) : tab === 'compras' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Documento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-indigo-700">{c.codigo_interno}</td>
                    <td className="px-4 py-2">{nombreProv(c.proveedor_id)}</td>
                    <td className="px-4 py-2">
                      {c.tipo_comprobante} {c.serie}-{c.numero}
                    </td>
                    <td className="px-4 py-2">{c.fecha_emision}</td>
                    <td className="px-4 py-2 text-right font-semibold">S/ {Number(c.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {compras.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">Sin compras registradas</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Δ cantidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock res.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movs.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{m.created_at?.replace('T', ' ').slice(0, 19)}</td>
                    <td className="px-4 py-2">{m.tipo}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(m.cantidad_delta).toFixed(4)}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(m.stock_resultante).toFixed(4)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {m.referencia_tabla || '—'} {m.referencia_id != null ? `#${m.referencia_id}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movs.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">Sin movimientos</p>}
          </div>
        )}
      </div>
      {modalCompra && (
        <ModalCompra
          productos={productos}
          onClose={() => setModalCompra(false)}
          onSave={() => {
            setModalCompra(false)
            setNotif({ tipo: 'exito', mensaje: 'Compra registrada; stock actualizado' })
            cargar()
          }}
        />
      )}
      {modalAjuste && (
        <ModalAjuste
          productos={productos}
          onClose={() => setModalAjuste(false)}
          onSave={() => {
            setModalAjuste(false)
            setNotif({ tipo: 'exito', mensaje: 'Ajuste aplicado' })
            cargar()
          }}
        />
      )}
    </div>
  )
}
