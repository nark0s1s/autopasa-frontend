import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Wallet, Plus, X } from 'lucide-react'
import {
  getGastosOperativos,
  crearGastoOperativo,
  actualizarGastoOperativo,
  anularGastoOperativo,
  getProveedores,
  getTiposComprobanteGasto,
  getCentrosCostoGasto,
  getCategoriasGastoOperativo,
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

function labelProveedor(p) {
  return `${p.numero_documento} — ${p.razon_social}`
}

function fmtMoney(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ModalGasto({
  tipos,
  centros,
  categorias,
  onClose,
  onSave,
  editar,
}) {
  const [proveedor_id, setProveedorId] = useState(editar ? String(editar.proveedor_id) : '')
  const [proveedorTexto, setProveedorTexto] = useState(
    editar && editar.proveedor ? labelProveedor(editar.proveedor) : ''
  )
  const [opcionesProveedor, setOpcionesProveedor] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [listaProvAbierta, setListaProvAbierta] = useState(false)
  const blurProvTimer = useRef(null)

  const [tipo_comprobante_gasto_id, setTipoComprobante] = useState(
    editar ? String(editar.tipo_comprobante?.id || '') : ''
  )
  const [centro_costo_id, setCentroCosto] = useState(
    editar ? String(editar.centro_costo?.id || '') : ''
  )
  const [categoria_gasto_operativo_id, setCategoria] = useState(
    editar ? String(editar.categoria_gasto?.id || '') : ''
  )
  const [serie, setSerie] = useState(editar?.serie || 'F001')
  const [numero, setNumero] = useState(editar?.numero || '')
  const [fecha_emision, setFechaEmision] = useState(
    editar?.fecha_emision || new Date().toISOString().slice(0, 10)
  )
  const [tercero_tipo_documento, setTerceroTipo] = useState(editar?.tercero_tipo_documento || 'RUC')
  const [tercero_numero_documento, setTerceroNumero] = useState(editar?.tercero_numero_documento || '')
  const [tercero_razon_social, setTerceroRazon] = useState(editar?.tercero_razon_social || '')
  const [subtotal, setSubtotal] = useState(editar != null ? String(editar.subtotal) : '')
  const [igv, setIgv] = useState(editar != null ? String(editar.igv) : '0')
  const [total, setTotal] = useState(editar != null ? String(editar.total) : '')
  const [observaciones, setObservaciones] = useState(editar?.observaciones || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editar?.proveedor) {
      setOpcionesProveedor((prev) => {
        if (prev.some((p) => p.id === editar.proveedor.id)) return prev
        return [editar.proveedor, ...prev]
      })
    }
  }, [editar])

  const proveedorSel = useMemo(() => {
    if (!proveedor_id) return null
    return opcionesProveedor.find((p) => String(p.id) === String(proveedor_id)) || null
  }, [proveedor_id, opcionesProveedor])

  const proveedorVista = useMemo(() => {
    if (proveedorSel) return proveedorSel
    if (editar?.proveedor && String(editar.proveedor.id) === String(proveedor_id)) return editar.proveedor
    return null
  }, [proveedorSel, proveedor_id, editar])

  const esProveedorGenerico = proveedorVista?.es_generico_sistema === true

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const q = proveedorTexto.trim()
      setProvLoading(true)
      try {
        const data = await getProveedores(true, {
          q: q.length ? q : undefined,
          limit: q.length ? 80 : 60,
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

  useEffect(() => {
    if (subtotal === '' && igv === '') {
      setTotal('')
      return
    }
    const s = parseFloat(subtotal)
    const i = parseFloat(igv)
    if (!Number.isNaN(s) && !Number.isNaN(i)) {
      setTotal(String((Math.round((s + i) * 100) / 100).toFixed(2)))
    }
  }, [subtotal, igv])

  const aplicarIgv18 = () => {
    const s = parseFloat(subtotal)
    if (Number.isNaN(s)) return
    const i = Math.round(s * 0.18 * 100) / 100
    setIgv(String(i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!proveedor_id) {
      setError('Elija un proveedor')
      return
    }
    if (!tipo_comprobante_gasto_id || !centro_costo_id || !categoria_gasto_operativo_id) {
      setError('Complete tipo de comprobante, centro de costo y categoría')
      return
    }
    const st = parseFloat(subtotal)
    const ig = parseFloat(igv)
    const tot = parseFloat(total)
    if (Number.isNaN(st) || Number.isNaN(ig) || Number.isNaN(tot)) {
      setError('Subtotal, IGV y total deben ser numéricos')
      return
    }
    if (Math.abs(tot - (st + ig)) > 0.02) {
      setError('El total debe coincidir con subtotal + IGV')
      return
    }

    const payload = {
      tipo_comprobante_gasto_id: parseInt(tipo_comprobante_gasto_id, 10),
      proveedor_id: parseInt(proveedor_id, 10),
      tercero_tipo_documento: esProveedorGenerico ? tercero_tipo_documento || null : null,
      tercero_numero_documento: esProveedorGenerico ? tercero_numero_documento.trim() || null : null,
      tercero_razon_social: esProveedorGenerico ? tercero_razon_social.trim() || null : null,
      centro_costo_id: parseInt(centro_costo_id, 10),
      categoria_gasto_operativo_id: parseInt(categoria_gasto_operativo_id, 10),
      serie: serie.trim(),
      numero: numero.trim(),
      fecha_emision,
      moneda: 'PEN',
      tipo_cambio: 1,
      subtotal: st,
      igv: ig,
      total: tot,
      observaciones: observaciones.trim() || null,
    }

    setGuardando(true)
    try {
      if (editar) await actualizarGastoOperativo(editar.id, payload)
      else await crearGastoOperativo(payload)
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">{editar ? 'Editar gasto operativo' : 'Nuevo gasto operativo'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de comprobante *</label>
              <select
                value={tipo_comprobante_gasto_id}
                onChange={(e) => setTipoComprobante(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor *</label>
              <input
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
                placeholder="Razón social o documento…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              />
              {listaProvAbierta && (
                <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
                  {provLoading && <li className="px-3 py-2 text-gray-500">Buscando…</li>}
                  {!provLoading &&
                    opcionesProveedor.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50"
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Centro de costo *</label>
              <select
                value={centro_costo_id}
                onChange={(e) => setCentroCosto(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría de gasto *</label>
              <select
                value={categoria_gasto_operativo_id}
                onChange={(e) => setCategoria(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                {categorias.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.codigo} — {k.nombre}
                  </option>
                ))}
              </select>
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
          </div>

          {esProveedorGenerico && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm text-amber-900 font-medium">Proveedor genérico: indique los datos del emisor en el comprobante</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo doc. tercero</label>
                  <select
                    value={tercero_tipo_documento}
                    onChange={(e) => setTerceroTipo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Número documento *</label>
                  <input
                    value={tercero_numero_documento}
                    onChange={(e) => setTerceroNumero(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Razón social *</label>
                  <input
                    value={tercero_razon_social}
                    onChange={(e) => setTerceroRazon(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subtotal *</label>
              <input type="number" step="0.01" min="0" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">IGV</label>
              <input type="number" step="0.01" min="0" value={igv} onChange={(e) => setIgv(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <button type="button" onClick={aplicarIgv18} className="text-sm text-indigo-600 font-medium px-2 py-2 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                IGV 18%
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Total</label>
              <input type="text" readOnly value={total} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GastosOperativosPage() {
  const [gastos, setGastos] = useState([])
  const [tipos, setTipos] = useState([])
  const [centros, setCentros] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notificacion, setNotificacion] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editar, setEditar] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [g, t, c, k] = await Promise.all([
        getGastosOperativos({ limit: 200 }),
        getTiposComprobanteGasto(true),
        getCentrosCostoGasto(true),
        getCategoriasGastoOperativo(true),
      ])
      setGastos(Array.isArray(g) ? g : [])
      setTipos(Array.isArray(t) ? t : [])
      setCentros(Array.isArray(c) ? c : [])
      setCategorias(Array.isArray(k) ? k : [])
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se pudo cargar la información')
      setGastos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const anular = async (row) => {
    if (!window.confirm(`¿Anular el gasto ${row.codigo_interno}?`)) return
    try {
      await anularGastoOperativo(row.id)
      setNotificacion({ tipo: 'ok', mensaje: 'Gasto anulado.' })
      cargar()
    } catch (err) {
      const detail = err.response?.data?.detail
      setNotificacion({ tipo: 'error', mensaje: typeof detail === 'string' ? detail : 'Error al anular' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
            <Wallet size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gastos operativos</h1>
            <p className="text-sm text-gray-600">Registro interno (no mueve stock). Facturas y recibos por honorarios.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditar(null)
            setModalNuevo(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          <Plus size={20} />
          Nuevo gasto
        </button>
      </div>

      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      {error && <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Código</th>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Proveedor</th>
                  <th className="px-3 py-2 font-semibold">Centro costo</th>
                  <th className="px-3 py-2 font-semibold">Categoría</th>
                  <th className="px-3 py-2 font-semibold text-right">Total</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                      No hay gastos registrados.
                    </td>
                  </tr>
                )}
                {gastos.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-3 py-2 font-mono text-xs">{r.codigo_interno}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.fecha_emision}</td>
                    <td className="px-3 py-2">{r.tipo_comprobante?.codigo}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={r.proveedor?.razon_social}>
                      {r.proveedor?.razon_social}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.centro_costo?.codigo}</td>
                    <td className="px-3 py-2 text-xs">{r.categoria_gasto?.codigo}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtMoney(r.total)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          r.estado === 'anulada' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.estado !== 'anulada' && (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="text-indigo-600 hover:underline text-xs"
                            onClick={() => {
                              setEditar(r)
                              setModalNuevo(true)
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="text-red-600 hover:underline text-xs" onClick={() => anular(r)}>
                            Anular
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNuevo && tipos.length > 0 && centros.length > 0 && categorias.length > 0 && (
        <ModalGasto
          tipos={tipos}
          centros={centros}
          categorias={categorias}
          editar={editar}
          onClose={() => {
            setModalNuevo(false)
            setEditar(null)
          }}
          onSave={() => {
            setModalNuevo(false)
            setEditar(null)
            setNotificacion({ tipo: 'ok', mensaje: 'Guardado correctamente.' })
            cargar()
          }}
        />
      )}

      {modalNuevo && (tipos.length === 0 || centros.length === 0 || categorias.length === 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md shadow-xl">
            <p className="text-gray-800 mb-4">
              Faltan datos de catálogo (tipo de comprobante, centro de costo o categoría). Ejecute la migración SQL y el
              bootstrap del API, o cree los catálogos desde la base de datos.
            </p>
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-800 text-white" onClick={() => setModalNuevo(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
