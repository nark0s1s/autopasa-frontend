import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Edit2, ToggleLeft, ToggleRight, X, Search, CreditCard, BadgePercent } from 'lucide-react'
import { getClientesAdmin, crearCliente, actualizarCliente } from '../utils/api'

// ──────────────────────────────────────────────
// Notificación inline
// ──────────────────────────────────────────────
function Notificacion({ notificacion, onClose }) {
  if (!notificacion) return null
  const esError = notificacion.tipo === 'error'
  return (
    <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${esError
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-green-50 border-green-200 text-green-800'}`}>
      <span>{esError ? '❌' : '✅'}</span>
      <div className="flex-1 text-sm whitespace-pre-line">{notificacion.mensaje}</div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
    </div>
  )
}

// ──────────────────────────────────────────────
// Modal Crear / Editar Cliente
// ──────────────────────────────────────────────
function ModalCliente({ cliente, onClose, onSave }) {
  const esEdicion = !!cliente
  const [form, setForm] = useState({
    codigo: cliente?.codigo || '',
    tipo_documento: cliente?.tipo_documento || 'RUC',
    numero_documento: cliente?.numero_documento || '',
    razon_social: cliente?.razon_social || '',
    nombre_comercial: cliente?.nombre_comercial || '',
    direccion: cliente?.direccion || '',
    telefono: cliente?.telefono || '',
    email: cliente?.email || '',
    tiene_credito: cliente?.tiene_credito ?? false,
    limite_credito: cliente?.limite_credito ?? 0,
    dias_credito: cliente?.dias_credito ?? 0,
    saldo_credito: cliente?.saldo_credito ?? 0,
    tiene_descuento: cliente?.tiene_descuento ?? false,
    porcentaje_descuento: cliente?.porcentaje_descuento ?? 0,
    activo: cliente?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      limite_credito: parseFloat(form.limite_credito) || 0,
      dias_credito: parseInt(form.dias_credito) || 0,
      saldo_credito: parseFloat(form.saldo_credito) || 0,
      porcentaje_descuento: parseFloat(form.porcentaje_descuento) || 0,
    }
    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarCliente(cliente.id, payload)
      } else {
        await crearCliente(payload)
      }
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(e => `• ${e.loc?.slice(-1)[0] ?? ''}: ${e.msg}`).join('\n'))
      } else {
        setError(typeof detail === 'string' ? detail : 'Error al guardar cliente')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <Building2 size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-xs text-gray-400">
                {esEdicion ? `ID: ${cliente.id}` : 'Complete los datos del cliente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Código y tipo/número doc */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="CLI-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo Doc. *</label>
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white">
                <option value="RUC">RUC</option>
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="PASS">Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">N° Documento *</label>
              <input name="numero_documento" value={form.numero_documento} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="20123456789" />
            </div>
          </div>

          {/* Razón social y nombre comercial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Razón Social *</label>
              <input name="razon_social" value={form.razon_social} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="EMPRESA SAC" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre Comercial</label>
              <input name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="Nombre comercial" />
            </div>
          </div>

          {/* Dirección, teléfono, email */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label>
              <input name="direccion" value={form.direccion} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="Av. Principal 123" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="999 888 777" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="contacto@empresa.com" />
            </div>
          </div>

          {/* Crédito */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={15} className="text-blue-500" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Crédito</span>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors ${form.tiene_credito ? 'bg-blue-500' : 'bg-gray-300'} relative`}>
                <input type="checkbox" name="tiene_credito" checked={form.tiene_credito} onChange={handleChange} className="sr-only" />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.tiene_credito ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Habilitado para crédito</span>
            </label>
            {form.tiene_credito && (
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Límite (S/)</label>
                  <input name="limite_credito" type="number" step="0.01" min="0" value={form.limite_credito} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Días de crédito</label>
                  <input name="dias_credito" type="number" min="0" value={form.dias_credito} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Saldo actual (S/)</label>
                  <input name="saldo_credito" type="number" step="0.01" value={form.saldo_credito} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="0.00" />
                </div>
              </div>
            )}
          </div>

          {/* Descuento */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <BadgePercent size={15} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Descuento</span>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors ${form.tiene_descuento ? 'bg-amber-500' : 'bg-gray-300'} relative`}>
                <input type="checkbox" name="tiene_descuento" checked={form.tiene_descuento} onChange={handleChange} className="sr-only" />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.tiene_descuento ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Tiene descuento especial</span>
            </label>
            {form.tiene_descuento && (
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Porcentaje (%)</label>
                <input name="porcentaje_descuento" type="number" step="0.01" min="0" max="100" value={form.porcentaje_descuento} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="5.00" />
              </div>
            )}
          </div>

          {/* Activo (solo edición) */}
          {esEdicion && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="sr-only" />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">{form.activo ? 'Cliente activo' : 'Cliente inactivo'}</span>
            </label>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {guardando
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando…</>
                : esEdicion ? 'Guardar cambios' : 'Crear cliente'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────
export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState(null)
  const [filtroCredito, setFiltroCredito] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteEditar, setClienteEditar] = useState(null)
  const [notificacion, setNotificacion] = useState(null)

  const mostrarNotif = (tipo, mensaje) => {
    setNotificacion({ tipo, mensaje })
    setTimeout(() => setNotificacion(null), 6000)
  }

  const cargarClientes = useCallback(async () => {
    setCargando(true)
    try {
      const data = await getClientesAdmin()
      setClientes(data)
    } catch {
      mostrarNotif('error', 'Error al cargar clientes')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarClientes() }, [cargarClientes])

  const handleToggleActivo = async (cli) => {
    try {
      await actualizarCliente(cli.id, { ...cli, activo: !cli.activo })
      mostrarNotif('exito', `Cliente ${cli.razon_social} ${!cli.activo ? 'activado' : 'desactivado'}`)
      cargarClientes()
    } catch (err) {
      mostrarNotif('error', err.response?.data?.detail || 'Error al cambiar estado')
    }
  }

  const handleGuardado = () => {
    setModalAbierto(false)
    setClienteEditar(null)
    mostrarNotif('exito', clienteEditar ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente')
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter(c => {
    const texto = busqueda.toLowerCase()
    const coincideTexto = !texto ||
      c.razon_social?.toLowerCase().includes(texto) ||
      c.nombre_comercial?.toLowerCase().includes(texto) ||
      c.codigo?.toLowerCase().includes(texto) ||
      c.numero_documento?.includes(texto)
    const coincideActivo = filtroActivo === null || c.activo === filtroActivo
    const coincideCredito =
      filtroCredito === 'todos' ||
      (filtroCredito === 'credito' && c.tiene_credito) ||
      (filtroCredito === 'descuento' && c.tiene_descuento) ||
      (filtroCredito === 'contado' && !c.tiene_credito)
    return coincideTexto && coincideActivo && coincideCredito
  })

  const formatMonto = (v) => `S/ ${parseFloat(v || 0).toFixed(2)}`

  return (
    <div className="p-6 space-y-6">
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-teal-600" size={28} />
            Gestión de Clientes
          </h1>
          <p className="text-sm text-gray-400 mt-1">Administra los clientes, su crédito y descuentos</p>
        </div>
        <button
          onClick={() => { setClienteEditar(null); setModalAbierto(true) }}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social, código o documento…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
        </div>
        <select
          value={filtroCredito}
          onChange={e => setFiltroCredito(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
          <option value="todos">Todos los tipos</option>
          <option value="credito">Con crédito</option>
          <option value="descuento">Con descuento</option>
          <option value="contado">Solo contado</option>
        </select>
        <div className="flex gap-2">
          {[null, true, false].map(val => {
            const labels = { null: 'Todos', true: 'Activos', false: 'Inactivos' }
            return (
              <button key={String(val)}
                onClick={() => setFiltroActivo(val)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filtroActivo === val ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {labels[String(val)]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tarjetas resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total clientes', value: clientes.length, color: 'teal' },
          { label: 'Activos', value: clientes.filter(c => c.activo).length, color: 'green' },
          { label: 'Con crédito', value: clientes.filter(c => c.tiene_credito).length, color: 'blue' },
          { label: 'Con descuento', value: clientes.filter(c => c.tiene_descuento).length, color: 'amber' },
        ].map(s => (
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-4`}>
            <p className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</p>
            <p className={`text-xs text-${s.color}-500 font-medium mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Documento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contacto</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Crédito</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Límite / Saldo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Descuento</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientesFiltrados.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {c.razon_social?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 truncate max-w-[160px]">{c.razon_social}</p>
                          {c.nombre_comercial && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{c.nombre_comercial}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs text-gray-400">{c.tipo_documento} </span>{c.numero_documento}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.telefono && <p>{c.telefono}</p>}
                      {c.email && <p className="truncate max-w-[140px]">{c.email}</p>}
                      {!c.telefono && !c.email && '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.tiene_credito
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <CreditCard size={11} /> {c.dias_credito}d
                          </span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {c.tiene_credito ? (
                        <div>
                          <p className="font-semibold text-gray-700">{formatMonto(c.limite_credito)}</p>
                          <p className="text-gray-400">Saldo: {formatMonto(c.saldo_credito)}</p>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.tiene_descuento
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                            <BadgePercent size={11} /> {parseFloat(c.porcentaje_descuento || 0).toFixed(1)}%
                          </span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setClienteEditar(c); setModalAbierto(true) }}
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-500 hover:text-teal-700 transition-colors"
                          title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(c)}
                          className={`p-1.5 rounded-lg transition-colors ${c.activo
                            ? 'hover:bg-red-50 text-red-400 hover:text-red-600'
                            : 'hover:bg-green-50 text-green-500 hover:text-green-700'}`}
                          title={c.activo ? 'Desactivar' : 'Activar'}>
                          {c.activo ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalCliente
          cliente={clienteEditar}
          onClose={() => { setModalAbierto(false); setClienteEditar(null) }}
          onSave={handleGuardado}
        />
      )}
    </div>
  )
}
