import { useState, useEffect, useCallback } from 'react'
import { Truck, Plus, Edit2, ToggleLeft, ToggleRight, X, Search } from 'lucide-react'
import { getProveedores, crearProveedor, actualizarProveedor, getBancos } from '../utils/api'

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

function ModalProveedor({ proveedor, bancos, onClose, onSave }) {
  const esEdicion = !!proveedor
  const [form, setForm] = useState({
    tipo_documento: proveedor?.tipo_documento || 'RUC',
    numero_documento: proveedor?.numero_documento || '',
    razon_social: proveedor?.razon_social || '',
    nombre_comercial: proveedor?.nombre_comercial || '',
    direccion: proveedor?.direccion || '',
    telefono: proveedor?.telefono || '',
    email: proveedor?.email || '',
    contacto_nombre: proveedor?.contacto_nombre || '',
    contacto_telefono: proveedor?.contacto_telefono || '',
    dias_credito: proveedor?.dias_credito ?? 0,
    condicion_pago: proveedor?.condicion_pago || '',
    banco_id: proveedor?.banco_id ?? '',
    banco_otro_nombre: proveedor?.banco_otro_nombre || '',
    tipo_cuenta: proveedor?.tipo_cuenta || '',
    moneda_cuenta: proveedor?.moneda_cuenta || 'PEN',
    numero_cuenta: proveedor?.numero_cuenta || '',
    cci: proveedor?.cci || '',
    observaciones: proveedor?.observaciones || '',
    activo: proveedor?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const payload = {
        ...form,
        dias_credito: parseInt(form.dias_credito, 10) || 0,
        banco_id: form.banco_id === '' ? null : parseInt(form.banco_id, 10),
        banco_otro_nombre: form.banco_otro_nombre?.trim() || null,
        tipo_cuenta: form.tipo_cuenta || null,
        moneda_cuenta: form.moneda_cuenta || null,
        numero_cuenta: form.numero_cuenta?.trim() || null,
        cci: form.cci?.trim() || null,
      }
      if (esEdicion) await actualizarProveedor(proveedor.id, payload)
      else await crearProveedor(payload)
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <p className="text-xs text-gray-500">
            El identificador interno es el <strong>ID</strong>. El <strong>código</strong> se guarda igual al número de documento (sin espacios), no hace falta ingresarlo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo doc.</label>
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="RUC">RUC</option>
                <option value="DNI">DNI</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Número documento *</label>
              <input name="numero_documento" value={form.numero_documento} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Razón social *</label>
            <input name="razon_social" value={form.razon_social} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre comercial</label>
            <input name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contacto</label>
              <input name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tel. contacto</label>
              <input name="contacto_telefono" value={form.contacto_telefono} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Días crédito</label>
              <input name="dias_credito" type="number" min="0" value={form.dias_credito} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Condición pago</label>
              <input name="condicion_pago" value={form.condicion_pago} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">Datos bancarios (pagos)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Banco</label>
                <select
                  name="banco_id"
                  value={form.banco_id}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">— Sin especificar —</option>
                  {(bancos || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre banco (si eligió «Otro» o sucursal)</label>
                <input
                  name="banco_otro_nombre"
                  value={form.banco_otro_nombre}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de cuenta</label>
                <select name="tipo_cuenta" value={form.tipo_cuenta} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">—</option>
                  <option value="AHORROS">Ahorros</option>
                  <option value="CORRIENTE">Cuenta corriente</option>
                  <option value="CTS_SOLES">CTS soles</option>
                  <option value="CTS_DOLARES">CTS dólares</option>
                  <option value="INTERBANCARIA">Cuenta interbancaria</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Moneda de la cuenta</label>
                <select name="moneda_cuenta" value={form.moneda_cuenta} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Número de cuenta</label>
                <input name="numero_cuenta" value={form.numero_cuenta} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CCI</label>
                <input name="cci" value={form.cci} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          {esEdicion && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} /> Activo
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Proveedores() {
  const [lista, setLista] = useState([])
  const [bancos, setBancos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(false)
  const [editar, setEditar] = useState(null)
  const [notif, setNotif] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [data, banks] = await Promise.all([getProveedores(null), getBancos(true).catch(() => [])])
      setLista(Array.isArray(data) ? data : [])
      setBancos(Array.isArray(banks) ? banks : [])
    } catch {
      setNotif({ tipo: 'error', mensaje: 'Error al cargar proveedores' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtrados = lista.filter((p) => {
    const t = busqueda.toLowerCase()
    if (!t) return true
    return (
      (p.razon_social || '').toLowerCase().includes(t) ||
      (p.codigo || '').toLowerCase().includes(t) ||
      (p.numero_documento || '').includes(t)
    )
  })

  const toggleActivo = async (p) => {
    try {
      const { banco, id, created_at, updated_at, ...rest } = p
      await actualizarProveedor(p.id, { ...rest, activo: !p.activo })
      setNotif({ tipo: 'exito', mensaje: 'Estado actualizado' })
      cargar()
    } catch (err) {
      setNotif({ tipo: 'error', mensaje: err.response?.data?.detail || 'Error' })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Notificacion notificacion={notif} onClose={() => setNotif(null)} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-indigo-600" size={28} />
            Proveedores
          </h1>
          <p className="text-sm text-gray-400 mt-1">Datos para facturas de compra y logística</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditar(null)
            setModal(true)
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
        >
          <Plus size={18} /> Nuevo proveedor
        </button>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar…"
          className="w-full max-w-md pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm"
        />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center text-gray-400">Cargando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Documento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Razón social</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Activo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600"> </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-indigo-800">{p.tipo_documento}</span>{' '}
                      <span className="font-mono text-sm font-medium">{p.numero_documento}</span>
                    </td>
                    <td className="px-4 py-2 font-medium">{p.razon_social}</td>
                    <td className="px-4 py-2 text-center">{p.activo ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditar(p)
                            setModal(true)
                          }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button type="button" onClick={() => toggleActivo(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          {p.activo ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
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
      {modal && (
        <ModalProveedor
          key={editar?.id ?? 'nuevo'}
          proveedor={editar}
          bancos={bancos}
          onClose={() => {
            setModal(false)
            setEditar(null)
          }}
          onSave={() => {
            setModal(false)
            setEditar(null)
            setNotif({ tipo: 'exito', mensaje: 'Proveedor guardado' })
            cargar()
          }}
        />
      )}
    </div>
  )
}
