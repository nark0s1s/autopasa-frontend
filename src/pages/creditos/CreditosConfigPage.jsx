import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Pencil, Plus, RefreshCw, Save, Trash2, Upload, X } from 'lucide-react'
import {
  actualizarCreditoPersona,
  asignarCreditoProducto,
  actualizarCreditoPlaca,
  crearCreditoPersona,
  crearCreditoPlaca,
  crearCreditoPrecio,
  eliminarCreditoPersona,
  eliminarCreditoPlaca,
  getClientesAdmin,
  getCreditoPerfil,
  getProductosActivos,
  listCreditoPersonas,
  listCreditoPlacas,
  listCreditoPrecios,
  listCreditoProductos,
  subirFirmaCreditoPersona,
  upsertCreditoPerfil,
} from '../../utils/api'
import CreditoFirmaImage from '../../components/CreditoFirmaImage'

function fmt2(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x.toFixed(2) : '—'
}

function creditoDetail(err) {
  const d = err?.response?.data?.detail
  if (d && typeof d === 'object' && d.mensaje) return d.mensaje
  if (typeof d === 'string') return d
  return 'No se pudo completar la operación'
}

function toYMD(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

const SECTION_META = {
  perfil: {
    title: 'Perfil y límites',
    blurb:
      'Modalidad, límites, sobregiro y reglas operativas (persona autorizada, orden de compra, km, firma del chofer) del cliente ya registrado en Clientes.',
  },
  productos: {
    title: 'Productos autorizados',
    blurb: 'Asigne productos y cupos por modalidad al cliente con perfil de crédito.',
  },
  precios: {
    title: 'Precios',
    blurb: 'Vigencias de precio fijo o ajuste en soles por producto y modalidad.',
  },
  placas: {
    title: 'Placas',
    blurb:
      'Placas autorizadas. Opcionalmente asocie 1 o más productos; si no elige ninguno, usa todos los productos del cliente.',
  },
  personas: {
    title: 'Personas y firmas autorizadas',
    blurb:
      'Personas que retiran combustible y firmas de referencia para validar órdenes de compra / pedido en pista.',
  },
}

const CLIENTE_STORAGE_KEY = 'creditos.clienteId'

const PERFIL_DEFAULT = {
  modalidad: 'credito',
  estado: 'activo',
  estado_motivo: '',
  limite_monto: '10000',
  sobregiro_monto: '0',
  dias_credito: '30',
  frecuencia_facturacion: 'manual',
  dia_corte: '',
  dia_semana_corte_cupo: '',
  dia_semana_corte_facturacion: '',
  facturacion_anticipo: 'no_aplica',
  frecuencia_cupo_anticipo: 'mensual',
  permite_guia_sin_placa: false,
  permite_galonera: false,
  exige_persona_autorizada: true,
  solicitar_orden_compra: false,
  solicitar_orden_pedido: false,
  registrar_km_vehiculo: false,
  solicitar_firma_chofer: false,
  detalle_factura: 'por_producto',
  observacion: '',
}

function perfilToForm(p) {
  return {
    modalidad: p.modalidad || 'credito',
    estado: p.estado || 'activo',
    estado_motivo: p.estado_motivo || '',
    limite_monto: p.limite_monto != null ? String(p.limite_monto) : '',
    sobregiro_monto: p.sobregiro_monto != null ? String(p.sobregiro_monto) : '0',
    dias_credito: p.dias_credito != null ? String(p.dias_credito) : '0',
    frecuencia_facturacion: p.frecuencia_facturacion || 'manual',
    dia_corte: p.dia_corte != null ? String(p.dia_corte) : '',
    dia_semana_corte_cupo: p.dia_semana_corte_cupo != null ? String(p.dia_semana_corte_cupo) : '',
    dia_semana_corte_facturacion:
      p.dia_semana_corte_facturacion != null ? String(p.dia_semana_corte_facturacion) : '',
    facturacion_anticipo: p.facturacion_anticipo || 'no_aplica',
    frecuencia_cupo_anticipo: p.frecuencia_cupo_anticipo || 'mensual',
    permite_guia_sin_placa: !!p.permite_guia_sin_placa,
    permite_galonera: !!p.permite_galonera,
    exige_persona_autorizada: p.exige_persona_autorizada !== false,
    solicitar_orden_compra: !!p.solicitar_orden_compra,
    solicitar_orden_pedido: !!p.solicitar_orden_pedido,
    registrar_km_vehiculo: !!p.registrar_km_vehiculo,
    solicitar_firma_chofer: !!p.solicitar_firma_chofer,
    detalle_factura: p.detalle_factura || 'por_producto',
    observacion: p.observacion || '',
  }
}

function formToPerfilPayload(f) {
  const numOrNull = (v) => {
    const s = String(v ?? '').trim()
    if (s === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  const intOrNull = (v) => {
    const n = numOrNull(v)
    return n == null ? null : Math.trunc(n)
  }
  return {
    modalidad: f.modalidad,
    estado: f.estado,
    estado_motivo: f.estado_motivo?.trim() || null,
    limite_monto: numOrNull(f.limite_monto),
    sobregiro_monto: numOrNull(f.sobregiro_monto) ?? 0,
    dias_credito: intOrNull(f.dias_credito) ?? 0,
    frecuencia_facturacion: f.frecuencia_facturacion,
    dia_corte: intOrNull(f.dia_corte),
    dia_semana_corte_cupo: intOrNull(f.dia_semana_corte_cupo),
    dia_semana_corte_facturacion: intOrNull(f.dia_semana_corte_facturacion),
    facturacion_anticipo: f.facturacion_anticipo,
    frecuencia_cupo_anticipo: f.frecuencia_cupo_anticipo,
    permite_guia_sin_placa: !!f.permite_guia_sin_placa,
    permite_galonera: !!f.permite_galonera,
    exige_persona_autorizada: !!f.exige_persona_autorizada,
    solicitar_orden_compra: !!f.solicitar_orden_compra,
    solicitar_orden_pedido: !!f.solicitar_orden_pedido,
    registrar_km_vehiculo: !!f.registrar_km_vehiculo,
    solicitar_firma_chofer: !!f.solicitar_orden_compra && !!f.solicitar_firma_chofer,
    detalle_factura: f.detalle_factura,
    observacion: f.observacion?.trim() || null,
  }
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'
const checkCls = 'rounded border-gray-300 text-primary-600 focus:ring-primary-500'

export default function CreditosConfigPage({ section = 'perfil' }) {
  const meta = SECTION_META[section] || SECTION_META.perfil
  const [clientes, setClientes] = useState([])
  const [productosCat, setProductosCat] = useState([])
  const [q, setQ] = useState('')
  const [clienteId, setClienteId] = useState(() => {
    try {
      return sessionStorage.getItem(CLIENTE_STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [perfil, setPerfil] = useState(null)
  const [form, setForm] = useState(PERFIL_DEFAULT)
  const [productos, setProductos] = useState([])
  const [precios, setPrecios] = useState([])
  const [placas, setPlacas] = useState([])
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sinPerfil, setSinPerfil] = useState(false)

  const [prodForm, setProdForm] = useState({
    producto_id: '',
    modalidad: 'credito',
    limite_monto: '',
    limite_galones: '',
    activo: true,
  })
  const [precioForm, setPrecioForm] = useState({
    producto_id: '',
    modalidad: 'credito',
    tipo_precio: 'precio_fijo',
    valor: '',
    vigencia_desde: toYMD(),
    vigencia_hasta: '',
    activo: true,
  })
  const [placaForm, setPlacaForm] = useState({
    placa: '',
    descripcion: '',
    permite_galonera: false,
    activo: true,
    producto_ids: [],
  })
  const [placaEditId, setPlacaEditId] = useState(null)
  const [personaForm, setPersonaForm] = useState({
    nombres: '',
    tipo_documento: 'DNI',
    numero_documento: '',
    cargo: '',
    telefono: '',
    puede_comprar: true,
    activo: true,
  })
  const [personaEditId, setPersonaEditId] = useState(null)
  const [personaFirmaFile, setPersonaFirmaFile] = useState(null)
  const [personaFirmaPreview, setPersonaFirmaPreview] = useState(null)

  useEffect(() => {
    getClientesAdmin(true)
      .then((d) => setClientes(Array.isArray(d) ? d : []))
      .catch(() => setClientes([]))
    getProductosActivos()
      .then((d) => setProductosCat(Array.isArray(d) ? d : []))
      .catch(() => setProductosCat([]))
  }, [])

  useEffect(() => {
    try {
      if (clienteId) sessionStorage.setItem(CLIENTE_STORAGE_KEY, clienteId)
      else sessionStorage.removeItem(CLIENTE_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [clienteId])

  const clientesFiltrados = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return clientes
    return clientes.filter((c) => {
      const nombre = (c.razon_social || c.nombre_comercial || `${c.nombres || ''} ${c.apellidos || ''}`).toLowerCase()
      const doc = String(c.numero_documento || c.ruc || '').toLowerCase()
      return nombre.includes(s) || doc.includes(s)
    })
  }, [clientes, q])

  const clienteSel = useMemo(
    () => clientes.find((c) => String(c.id) === String(clienteId)) || null,
    [clientes, clienteId],
  )

  const nombreProducto = useCallback(
    (id) => {
      const p = productosCat.find((x) => x.id === id)
      return p ? `${p.codigo || ''} · ${p.nombre || ''}`.trim() : `#${id}`
    },
    [productosCat],
  )

  const cargarCliente = useCallback(async (id) => {
    if (!id) {
      setPerfil(null)
      setSinPerfil(false)
      setForm(PERFIL_DEFAULT)
      setProductos([])
      setPrecios([])
      setPlacas([])
      setPersonas([])
      return
    }
    setLoading(true)
    try {
      let p = null
      let missing = false
      try {
        p = await getCreditoPerfil(id)
      } catch (err) {
        if (err?.response?.status === 404) missing = true
        else throw err
      }
      setSinPerfil(missing)
      setPerfil(p)
      setForm(p ? perfilToForm(p) : PERFIL_DEFAULT)

      if (p) {
        const [prods, prcs, plcs, pers] = await Promise.all([
          listCreditoProductos(id),
          listCreditoPrecios(id),
          listCreditoPlacas(id),
          listCreditoPersonas(id),
        ])
        setProductos(Array.isArray(prods) ? prods : [])
        setPrecios(Array.isArray(prcs) ? prcs : [])
        setPlacas(Array.isArray(plcs) ? plcs : [])
        setPersonas(Array.isArray(pers) ? pers : [])
      } else {
        setProductos([])
        setPrecios([])
        setPlacas([])
        setPersonas([])
      }
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarCliente(clienteId)
  }, [clienteId, cargarCliente])

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const guardarPerfil = async (e) => {
    e.preventDefault()
    if (!clienteId) return
    try {
      setSaving(true)
      const saved = await upsertCreditoPerfil(clienteId, formToPerfilPayload(form))
      setPerfil(saved)
      setSinPerfil(false)
      setForm(perfilToForm(saved))
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const agregarProducto = async (e) => {
    e.preventDefault()
    if (!clienteId || !prodForm.producto_id) return
    try {
      setSaving(true)
      await asignarCreditoProducto(clienteId, {
        producto_id: parseInt(prodForm.producto_id, 10),
        modalidad: prodForm.modalidad,
        limite_monto: prodForm.limite_monto === '' ? null : Number(prodForm.limite_monto),
        limite_galones: prodForm.limite_galones === '' ? null : Number(prodForm.limite_galones),
        activo: !!prodForm.activo,
      })
      setProdForm((f) => ({ ...f, producto_id: '', limite_monto: '', limite_galones: '' }))
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const agregarPrecio = async (e) => {
    e.preventDefault()
    if (!clienteId || !precioForm.producto_id || !precioForm.valor) return
    try {
      setSaving(true)
      await crearCreditoPrecio(clienteId, {
        producto_id: parseInt(precioForm.producto_id, 10),
        modalidad: precioForm.modalidad,
        tipo_precio: precioForm.tipo_precio,
        valor: Number(precioForm.valor),
        vigencia_desde: precioForm.vigencia_desde,
        vigencia_hasta: precioForm.vigencia_hasta || null,
        activo: !!precioForm.activo,
      })
      setPrecioForm((f) => ({ ...f, valor: '', vigencia_hasta: '' }))
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const productosClienteUnicos = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const r of productos) {
      if (!r.activo || seen.has(r.producto_id)) continue
      seen.add(r.producto_id)
      out.push(r.producto_id)
    }
    return out
  }, [productos])

  const resetPlacaForm = () => {
    setPlacaEditId(null)
    setPlacaForm({ placa: '', descripcion: '', permite_galonera: false, activo: true, producto_ids: [] })
  }

  const editarPlaca = (r) => {
    setPlacaEditId(r.id)
    setPlacaForm({
      placa: r.placa || '',
      descripcion: r.descripcion || '',
      permite_galonera: !!r.permite_galonera,
      activo: r.activo !== false,
      producto_ids: Array.isArray(r.producto_ids) ? r.producto_ids.map(Number) : [],
    })
  }

  const togglePlacaProducto = (productoId) => {
    const id = Number(productoId)
    setPlacaForm((f) => {
      const set = new Set((f.producto_ids || []).map(Number))
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...f, producto_ids: Array.from(set) }
    })
  }

  const guardarPlaca = async (e) => {
    e.preventDefault()
    if (!clienteId || !placaForm.placa.trim()) return
    const payload = {
      placa: placaForm.placa.trim(),
      descripcion: placaForm.descripcion.trim() || null,
      permite_galonera: !!placaForm.permite_galonera,
      activo: !!placaForm.activo,
      producto_ids: (placaForm.producto_ids || []).map(Number),
    }
    try {
      setSaving(true)
      if (placaEditId) {
        await actualizarCreditoPlaca(clienteId, placaEditId, payload)
      } else {
        await crearCreditoPlaca(clienteId, payload)
      }
      resetPlacaForm()
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const borrarPlaca = async (r) => {
    if (!clienteId || !r?.id) return
    const ok = window.confirm(
      `¿Eliminar la placa ${r.placa}? Si tiene historial se desactivará en lugar de borrarse.`,
    )
    if (!ok) return
    try {
      setSaving(true)
      const res = await eliminarCreditoPlaca(clienteId, r.id)
      if (res?.mensaje) alert(res.mensaje)
      if (placaEditId === r.id) resetPlacaForm()
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const borrarPersona = async (r) => {
    if (!clienteId || !r?.id) return
    const ok = window.confirm(
      `¿Eliminar a ${r.nombres}? Si tiene historial de despachos se desactivará en lugar de borrarse.`,
    )
    if (!ok) return
    try {
      setSaving(true)
      const res = await eliminarCreditoPersona(clienteId, r.id)
      if (res?.mensaje) alert(res.mensaje)
      if (personaEditId === r.id) resetPersonaForm()
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const resetPersonaForm = () => {
    setPersonaEditId(null)
    setPersonaFirmaFile(null)
    if (personaFirmaPreview) URL.revokeObjectURL(personaFirmaPreview)
    setPersonaFirmaPreview(null)
    setPersonaForm({
      nombres: '',
      tipo_documento: 'DNI',
      numero_documento: '',
      cargo: '',
      telefono: '',
      puede_comprar: true,
      activo: true,
    })
  }

  const editarPersona = (r) => {
    setPersonaEditId(r.id)
    setPersonaFirmaFile(null)
    if (personaFirmaPreview) URL.revokeObjectURL(personaFirmaPreview)
    setPersonaFirmaPreview(null)
    setPersonaForm({
      nombres: r.nombres || '',
      tipo_documento: r.tipo_documento || 'DNI',
      numero_documento: r.numero_documento || '',
      cargo: r.cargo || '',
      telefono: r.telefono || '',
      puede_comprar: r.puede_comprar !== false,
      activo: r.activo !== false,
    })
  }

  const onPersonaFirmaChange = (e) => {
    const file = e.target.files?.[0] || null
    if (personaFirmaPreview) URL.revokeObjectURL(personaFirmaPreview)
    setPersonaFirmaFile(file)
    setPersonaFirmaPreview(file ? URL.createObjectURL(file) : null)
  }

  const guardarPersona = async (e) => {
    e.preventDefault()
    if (!clienteId || !personaForm.nombres.trim()) return
    try {
      setSaving(true)
      const payload = {
        nombres: personaForm.nombres.trim(),
        tipo_documento: personaForm.tipo_documento || null,
        numero_documento: personaForm.numero_documento.trim() || null,
        cargo: personaForm.cargo.trim() || null,
        telefono: personaForm.telefono.trim() || null,
        puede_comprar: !!personaForm.puede_comprar,
        activo: !!personaForm.activo,
      }
      let personaId = personaEditId
      if (personaEditId) {
        await actualizarCreditoPersona(clienteId, personaEditId, payload)
      } else {
        const created = await crearCreditoPersona(clienteId, payload)
        personaId = created?.id
      }
      if (personaFirmaFile && personaId) {
        await subirFirmaCreditoPersona(clienteId, personaId, personaFirmaFile)
      }
      resetPersonaForm()
      await cargarCliente(clienteId)
    } catch (err) {
      alert(creditoDetail(err))
    } finally {
      setSaving(false)
    }
  }

  const nombreCliente = (c) =>
    c.razon_social || c.nombre_comercial || `${c.nombres || ''} ${c.apellidos || ''}`.trim() || `Cliente #${c.id}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/25">
                <CreditCard className="w-6 h-6" />
              </span>
              Créditos — {meta.title}
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              {meta.blurb} El alta del cliente se hace en{' '}
              <Link to="/clientes" className="text-emerald-800 underline underline-offset-2">
                Clientes
              </Link>
              ; aquí solo se configura el crédito.
            </p>
          </div>
          {clienteId && (
            <button
              type="button"
              className="btn btn-secondary inline-flex items-center gap-2 self-start"
              onClick={() => cargarCliente(clienteId)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar cliente…"
                className={inputCls}
              />
            </div>
            <ul className="max-h-[28rem] overflow-y-auto divide-y divide-gray-100">
              {clientesFiltrados.map((c) => {
                const active = String(c.id) === String(clienteId)
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setClienteId(String(c.id))}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        active ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <div className="font-medium truncate">{nombreCliente(c)}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {c.numero_documento || c.ruc || '—'}
                      </div>
                    </button>
                  </li>
                )
              })}
              {clientesFiltrados.length === 0 && (
                <li className="px-3 py-6 text-sm text-gray-500 text-center">Sin clientes</li>
              )}
            </ul>
          </aside>

          <section className="lg:col-span-8 space-y-4">
            {!clienteId && (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500 text-sm">
                Seleccione un cliente ya creado para configurar su crédito.
              </div>
            )}

            {clienteId && (
              <>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {clienteSel ? nombreCliente(clienteSel) : `Cliente #${clienteId}`}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sinPerfil
                          ? 'Sin perfil de crédito — créelo en Perfil y límites'
                          : perfil
                            ? `Modalidad ${perfil.modalidad} · estado ${perfil.estado}`
                            : loading
                              ? 'Cargando…'
                              : ''}
                      </p>
                    </div>
                  </div>
                  {perfil && !sinPerfil && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs text-gray-500">Disponible</div>
                        <div className="font-semibold">S/ {fmt2(perfil.credito_disponible_monto)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs text-gray-500">Utilizado</div>
                        <div className="font-semibold">S/ {fmt2(perfil.credito_utilizado_monto)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs text-gray-500">Pend. facturar</div>
                        <div className="font-semibold">S/ {fmt2(perfil.monto_pendiente_facturar)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <div className="text-xs text-gray-500">Anticipo disp.</div>
                        <div className="font-semibold">S/ {fmt2(perfil.anticipo_disponible_monto)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {section !== 'perfil' && sinPerfil && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                    Este cliente aún no tiene perfil de crédito. Primero créelo en{' '}
                    <Link to="/creditos/perfiles" className="font-semibold underline underline-offset-2">
                      Perfil y límites
                    </Link>
                    .
                  </div>
                )}

                {section === 'perfil' && (
                  <form onSubmit={guardarPerfil} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Modalidad">
                        <select className={inputCls} value={form.modalidad} onChange={(e) => setF('modalidad', e.target.value)}>
                          <option value="credito">Crédito</option>
                          <option value="anticipo">Anticipo</option>
                          <option value="ambos">Ambos</option>
                        </select>
                      </Field>
                      <Field label="Estado">
                        <select className={inputCls} value={form.estado} onChange={(e) => setF('estado', e.target.value)}>
                          <option value="activo">Activo</option>
                          <option value="suspendido">Suspendido</option>
                          <option value="bloqueado">Bloqueado</option>
                        </select>
                      </Field>
                      {(form.estado === 'bloqueado' || form.estado === 'suspendido') && (
                        <Field
                          label={`Motivo de ${form.estado === 'bloqueado' ? 'bloqueo' : 'suspensión'} (visible al grifero)`}
                          className="sm:col-span-2"
                        >
                          <textarea
                            className={inputCls}
                            rows={2}
                            required
                            value={form.estado_motivo}
                            onChange={(e) => setF('estado_motivo', e.target.value)}
                            placeholder="Ej. Deuda vencida, cliente con cheque rechazado…"
                          />
                        </Field>
                      )}
                      <Field label="Límite monto (S/)">
                        <input className={inputCls} value={form.limite_monto} onChange={(e) => setF('limite_monto', e.target.value)} inputMode="decimal" />
                      </Field>
                      <Field label="Sobregiro (S/)">
                        <input className={inputCls} value={form.sobregiro_monto} onChange={(e) => setF('sobregiro_monto', e.target.value)} inputMode="decimal" />
                      </Field>
                      <Field label="Días crédito">
                        <input className={inputCls} type="number" min="0" value={form.dias_credito} onChange={(e) => setF('dias_credito', e.target.value)} />
                      </Field>
                      <Field label="Frecuencia facturación">
                        <select className={inputCls} value={form.frecuencia_facturacion} onChange={(e) => setF('frecuencia_facturacion', e.target.value)}>
                          <option value="manual">Manual</option>
                          <option value="semanal">Semanal</option>
                          <option value="quincenal">Quincenal</option>
                          <option value="mensual">Mensual</option>
                        </select>
                      </Field>
                      <Field label="Detalle factura">
                        <select className={inputCls} value={form.detalle_factura} onChange={(e) => setF('detalle_factura', e.target.value)}>
                          <option value="por_producto">Por producto</option>
                          <option value="por_guia">Por guía</option>
                        </select>
                      </Field>
                      <Field label="Facturación anticipo">
                        <select className={inputCls} value={form.facturacion_anticipo} onChange={(e) => setF('facturacion_anticipo', e.target.value)}>
                          <option value="no_aplica">No aplica</option>
                          <option value="periodica">Periódica</option>
                        </select>
                      </Field>
                    </div>
                    <div className="space-y-3 text-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reglas operativas</p>
                      <div className="flex flex-wrap gap-4">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" className={checkCls} checked={form.permite_guia_sin_placa} onChange={(e) => setF('permite_guia_sin_placa', e.target.checked)} />
                          Permite guía sin placa
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className={checkCls}
                            checked={!form.permite_galonera}
                            onChange={(e) => setF('permite_galonera', !e.target.checked)}
                          />
                          No permite galoneras
                        </label>
                      </div>
                      <label className="flex items-start gap-2 max-w-2xl">
                        <input
                          type="checkbox"
                          className={`${checkCls} mt-0.5`}
                          checked={form.exige_persona_autorizada}
                          onChange={(e) => setF('exige_persona_autorizada', e.target.checked)}
                        />
                        <span>
                          <span className="font-medium text-gray-800">Exige persona autorizada</span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            Debe estar presente una persona del catálogo (Créditos → Personas autorizadas). Incluye firma de referencia al despachar.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 max-w-2xl">
                        <input
                          type="checkbox"
                          className={`${checkCls} mt-0.5`}
                          checked={form.registrar_km_vehiculo}
                          onChange={(e) => setF('registrar_km_vehiculo', e.target.checked)}
                        />
                        <span>
                          <span className="font-medium text-gray-800">Registrar el km del vehículo</span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            En cada guía económica se exigirá capturar el kilometraje.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 max-w-2xl">
                        <input
                          type="checkbox"
                          className={`${checkCls} mt-0.5`}
                          checked={form.solicitar_orden_pedido}
                          onChange={(e) => setF('solicitar_orden_pedido', e.target.checked)}
                        />
                        <span>
                          <span className="font-medium text-gray-800">Solicitar orden de pedido</span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            En el despacho se pedirá la orden de pedido del cliente.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 max-w-2xl">
                        <input
                          type="checkbox"
                          className={`${checkCls} mt-0.5`}
                          checked={form.solicitar_orden_compra}
                          onChange={(e) => {
                            const on = e.target.checked
                            setForm((prev) => ({
                              ...prev,
                              solicitar_orden_compra: on,
                              solicitar_firma_chofer: on ? prev.solicitar_firma_chofer : false,
                            }))
                          }}
                        />
                        <span>
                          <span className="font-medium text-gray-800">Solicitar orden de compra</span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            Exige adjuntar la OC y la firma autorizada del encargado de firmar la orden (persona del catálogo).
                          </span>
                        </span>
                      </label>
                      {form.solicitar_orden_compra && (
                        <label className="flex items-start gap-2 max-w-2xl ml-6 pl-3 border-l-2 border-emerald-200">
                          <input
                            type="checkbox"
                            className={`${checkCls} mt-0.5`}
                            checked={form.solicitar_firma_chofer}
                            onChange={(e) => setF('solicitar_firma_chofer', e.target.checked)}
                          />
                          <span>
                            <span className="font-medium text-gray-800">Solicitar firma del chofer</span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                              Solo aplica si se solicita orden de compra. El receptor debe ser chofer y firmar en la guía.
                            </span>
                          </span>
                        </label>
                      )}
                    </div>
                    <Field label="Observación">
                      <textarea className={inputCls} rows={2} value={form.observacion} onChange={(e) => setF('observacion', e.target.value)} />
                    </Field>
                    <div className="flex justify-end">
                      <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={saving || loading}>
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando…' : sinPerfil ? 'Crear perfil' : 'Guardar perfil'}
                      </button>
                    </div>
                  </form>
                )}

                {section === 'productos' && !sinPerfil && (
                  <div className="space-y-4">
                    <form onSubmit={agregarProducto} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Producto" className="sm:col-span-2">
                        <select className={inputCls} value={prodForm.producto_id} onChange={(e) => setProdForm((f) => ({ ...f, producto_id: e.target.value }))} required>
                          <option value="">Seleccionar…</option>
                          {productosCat.map((p) => (
                            <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Modalidad">
                        <select className={inputCls} value={prodForm.modalidad} onChange={(e) => setProdForm((f) => ({ ...f, modalidad: e.target.value }))}>
                          <option value="credito">Crédito</option>
                          <option value="anticipo">Anticipo</option>
                        </select>
                      </Field>
                      <Field label="Límite S/ (opcional)">
                        <input className={inputCls} value={prodForm.limite_monto} onChange={(e) => setProdForm((f) => ({ ...f, limite_monto: e.target.value }))} />
                      </Field>
                      <Field label="Límite galones (opcional)">
                        <input className={inputCls} value={prodForm.limite_galones} onChange={(e) => setProdForm((f) => ({ ...f, limite_galones: e.target.value }))} />
                      </Field>
                      <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={saving}>
                          <Plus className="w-4 h-4" /> Asignar
                        </button>
                      </div>
                    </form>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-left">Modalidad</th>
                            <th className="px-3 py-2 text-right">Lím. S/</th>
                            <th className="px-3 py-2 text-right">Disp.</th>
                            <th className="px-3 py-2 text-center">Activo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {productos.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2">{nombreProducto(r.producto_id)}</td>
                              <td className="px-3 py-2">{r.modalidad}</td>
                              <td className="px-3 py-2 text-right">{fmt2(r.limite_monto)}</td>
                              <td className="px-3 py-2 text-right">{fmt2(r.credito_disponible_monto)}</td>
                              <td className="px-3 py-2 text-center">{r.activo ? 'Sí' : 'No'}</td>
                            </tr>
                          ))}
                          {productos.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Sin productos asignados</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'precios' && !sinPerfil && (
                  <div className="space-y-4">
                    <form onSubmit={agregarPrecio} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Producto" className="sm:col-span-2">
                        <select className={inputCls} value={precioForm.producto_id} onChange={(e) => setPrecioForm((f) => ({ ...f, producto_id: e.target.value }))} required>
                          <option value="">Seleccionar…</option>
                          {productosCat.map((p) => (
                            <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Modalidad">
                        <select className={inputCls} value={precioForm.modalidad} onChange={(e) => setPrecioForm((f) => ({ ...f, modalidad: e.target.value }))}>
                          <option value="credito">Crédito</option>
                          <option value="anticipo">Anticipo</option>
                        </select>
                      </Field>
                      <Field label="Tipo">
                        <select className={inputCls} value={precioForm.tipo_precio} onChange={(e) => setPrecioForm((f) => ({ ...f, tipo_precio: e.target.value }))}>
                          <option value="precio_fijo">Precio fijo</option>
                          <option value="ajuste_soles">Ajuste soles</option>
                        </select>
                      </Field>
                      <Field label="Valor">
                        <input className={inputCls} value={precioForm.valor} onChange={(e) => setPrecioForm((f) => ({ ...f, valor: e.target.value }))} required />
                      </Field>
                      <Field label="Vigencia desde">
                        <input type="date" className={inputCls} value={precioForm.vigencia_desde} onChange={(e) => setPrecioForm((f) => ({ ...f, vigencia_desde: e.target.value }))} required />
                      </Field>
                      <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={saving}>
                          <Plus className="w-4 h-4" /> Agregar precio
                        </button>
                      </div>
                    </form>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-left">Tipo</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                            <th className="px-3 py-2 text-left">Desde</th>
                            <th className="px-3 py-2 text-center">Activo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {precios.map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-2">{nombreProducto(r.producto_id)} · {r.modalidad}</td>
                              <td className="px-3 py-2">{r.tipo_precio}</td>
                              <td className="px-3 py-2 text-right">{fmt2(r.valor)}</td>
                              <td className="px-3 py-2">{String(r.vigencia_desde || '').slice(0, 10)}</td>
                              <td className="px-3 py-2 text-center">{r.activo ? 'Sí' : 'No'}</td>
                            </tr>
                          ))}
                          {precios.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Sin precios</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'placas' && !sinPerfil && (
                  <div className="space-y-4">
                    <form onSubmit={guardarPlaca} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800">
                          {placaEditId ? `Corrigiendo placa #${placaEditId}` : 'Nueva placa'}
                        </p>
                        {placaEditId && (
                          <button type="button" className="text-xs text-gray-600 inline-flex items-center gap-1 hover:text-gray-900" onClick={resetPlacaForm}>
                            <X className="w-3.5 h-3.5" /> Cancelar edición
                          </button>
                        )}
                      </div>
                      <Field label="Placa">
                        <input className={inputCls} value={placaForm.placa} onChange={(e) => setPlacaForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))} required />
                      </Field>
                      <Field label="Descripción">
                        <input className={inputCls} value={placaForm.descripcion} onChange={(e) => setPlacaForm((f) => ({ ...f, descripcion: e.target.value }))} />
                      </Field>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className={checkCls}
                          checked={!placaForm.permite_galonera}
                          onChange={(e) => setPlacaForm((f) => ({ ...f, permite_galonera: !e.target.checked }))}
                        />
                        No permite galonera
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" className={checkCls} checked={placaForm.activo} onChange={(e) => setPlacaForm((f) => ({ ...f, activo: e.target.checked }))} />
                        Activa
                      </label>
                      <div className="sm:col-span-2 space-y-2">
                        <p className="text-xs font-semibold text-gray-600">Productos asociados a esta placa</p>
                        <p className="text-xs text-gray-500">
                          Si no marca ninguno, en consulta/despacho se usan todos los productos autorizados del cliente.
                          Si marca uno o más, solo esos (intersección con los del cliente).
                        </p>
                        {productosClienteUnicos.length === 0 ? (
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Primero asigne productos al cliente en Créditos → Productos autorizados.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {productosClienteUnicos.map((pid) => {
                              const on = (placaForm.producto_ids || []).map(Number).includes(Number(pid))
                              return (
                                <label
                                  key={pid}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                                    on ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-white text-gray-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className={checkCls}
                                    checked={on}
                                    onChange={() => togglePlacaProducto(pid)}
                                  />
                                  {nombreProducto(pid)}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={saving}>
                          {placaEditId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          {placaEditId ? 'Guardar cambios' : 'Agregar placa'}
                        </button>
                      </div>
                    </form>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Placa</th>
                            <th className="px-3 py-2 text-left">Descripción</th>
                            <th className="px-3 py-2 text-left">Productos</th>
                            <th className="px-3 py-2 text-center">No permite gal.</th>
                            <th className="px-3 py-2 text-center">Activo</th>
                            <th className="px-3 py-2 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {placas.map((r) => {
                            const pids = Array.isArray(r.producto_ids) ? r.producto_ids : []
                            return (
                            <tr key={r.id} className={placaEditId === r.id ? 'bg-emerald-50/60' : ''}>
                              <td className="px-3 py-2 font-medium">{r.placa}</td>
                              <td className="px-3 py-2">{r.descripcion || '—'}</td>
                              <td className="px-3 py-2 text-xs text-gray-700">
                                {pids.length === 0
                                  ? <span className="text-gray-500">Todos los del cliente</span>
                                  : pids.map((pid) => nombreProducto(pid)).join(', ')}
                              </td>
                              <td className="px-3 py-2 text-center">{r.permite_galonera ? 'No' : 'Sí'}</td>
                              <td className="px-3 py-2 text-center">{r.activo ? 'Sí' : 'No'}</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
                                    title="Corregir"
                                    onClick={() => editarPlaca(r)}
                                    disabled={saving}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                    title="Eliminar"
                                    onClick={() => borrarPlaca(r)}
                                    disabled={saving}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            )
                          })}
                          {placas.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Sin placas</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'personas' && !sinPerfil && (
                  <div className="space-y-4">
                    <form onSubmit={guardarPersona} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500">
                          {personaEditId
                            ? 'Editando persona — suba o reemplace la imagen de firma de referencia.'
                            : 'Alta de persona autorizada a firmar órdenes de compra / pedido.'}
                        </p>
                        {personaEditId && (
                          <button type="button" className="text-xs text-gray-600 inline-flex items-center gap-1 hover:text-gray-900" onClick={resetPersonaForm}>
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        )}
                      </div>
                      <Field label="Nombres" className="sm:col-span-2">
                        <input className={inputCls} value={personaForm.nombres} onChange={(e) => setPersonaForm((f) => ({ ...f, nombres: e.target.value }))} required />
                      </Field>
                      <Field label="Tipo doc.">
                        <select className={inputCls} value={personaForm.tipo_documento} onChange={(e) => setPersonaForm((f) => ({ ...f, tipo_documento: e.target.value }))}>
                          <option value="DNI">DNI</option>
                          <option value="CE">CE</option>
                          <option value="PAS">PAS</option>
                        </select>
                      </Field>
                      <Field label="Nº documento">
                        <input className={inputCls} value={personaForm.numero_documento} onChange={(e) => setPersonaForm((f) => ({ ...f, numero_documento: e.target.value }))} />
                      </Field>
                      <Field label="Cargo">
                        <input className={inputCls} value={personaForm.cargo} onChange={(e) => setPersonaForm((f) => ({ ...f, cargo: e.target.value }))} />
                      </Field>
                      <Field label="Teléfono">
                        <input className={inputCls} value={personaForm.telefono} onChange={(e) => setPersonaForm((f) => ({ ...f, telefono: e.target.value }))} />
                      </Field>
                      <Field label="Cargar firma desde esta PC" className="sm:col-span-2">
                        <p className="text-xs text-gray-500 mb-2">
                          Elija un archivo de imagen (JPG o PNG) de su máquina. No se usa URL.
                        </p>
                        <label className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-gray-300 rounded-lg px-3 py-3 cursor-pointer hover:border-emerald-500">
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                            <Upload className="w-4 h-4" />
                            {personaFirmaFile ? personaFirmaFile.name : 'Elegir imagen del equipo…'}
                          </span>
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPersonaFirmaChange} />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-4 items-start">
                          {personaFirmaPreview && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Nueva imagen</p>
                              <img src={personaFirmaPreview} alt="Vista previa firma" className="h-28 max-w-xs object-contain border rounded-lg bg-white" />
                            </div>
                          )}
                          {!personaFirmaPreview && personaEditId && personas.find((p) => p.id === personaEditId)?.firma_url && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Firma actual</p>
                              <CreditoFirmaImage personaId={personaEditId} alt="Firma actual" className="h-28 w-48 border rounded-lg" />
                            </div>
                          )}
                        </div>
                      </Field>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" className={checkCls} checked={personaForm.activo} onChange={(e) => setPersonaForm((f) => ({ ...f, activo: e.target.checked }))} />
                        Activa
                      </label>
                      <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={saving}>
                          {personaEditId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          {personaEditId ? 'Guardar persona' : 'Agregar persona'}
                        </button>
                      </div>
                    </form>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Nombre</th>
                            <th className="px-3 py-2 text-left">Documento</th>
                            <th className="px-3 py-2 text-center">Firma</th>
                            <th className="px-3 py-2 text-center">Activo</th>
                            <th className="px-3 py-2 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {personas.map((r) => (
                            <tr key={r.id} className={personaEditId === r.id ? 'bg-emerald-50/60' : ''}>
                              <td className="px-3 py-2 font-medium">{r.nombres}</td>
                              <td className="px-3 py-2">{[r.tipo_documento, r.numero_documento].filter(Boolean).join(' ') || '—'}</td>
                              <td className="px-3 py-2 text-center">
                                {r.firma_url ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <CreditoFirmaImage personaId={r.id} alt={`Firma ${r.nombres}`} className="h-14 w-28 border rounded bg-white" />
                                    <span className="text-xs text-emerald-700 font-medium">Registrada</span>
                                  </div>
                                ) : (
                                  <span className="text-amber-700 text-xs font-semibold">Sin firma</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">{r.activo ? 'Sí' : 'No'}</td>
                              <td className="px-3 py-2 text-right">
                                <div className="inline-flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
                                    title="Editar / subir firma"
                                    onClick={() => editarPersona(r)}
                                    disabled={saving}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                    title="Eliminar"
                                    onClick={() => borrarPersona(r)}
                                    disabled={saving}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {personas.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Sin personas autorizadas</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
