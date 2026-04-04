import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Edit2, UserX, UserCheck, Eye, EyeOff, X, Search, Shield } from 'lucide-react'
import { getEmpleadosF, crearEmpleado, actualizarEmpleado, desactivarEmpleado, getRoles } from '../utils/api'

// ──────────────────────────────────────────────
// Banner de notificación reutilizable
// ──────────────────────────────────────────────
function Notificacion({ notificacion, onClose }) {
  if (!notificacion) return null
  const esError = notificacion.tipo === 'error'
  return (
    <div className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${esError
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-green-50 border-green-200 text-green-800'}`}>
      <span className="text-lg">{esError ? '❌' : '✅'}</span>
      <div className="flex-1 text-sm whitespace-pre-line">{notificacion.mensaje}</div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────
// Modal de Crear / Editar Empleado
// ──────────────────────────────────────────────
function ModalEmpleado({ empleado, roles, onClose, onSave }) {
  const esEdicion = !!empleado
  const [form, setForm] = useState({
    codigo: empleado?.codigo || '',
    tipo_documento: empleado?.tipo_documento || 'DNI',
    numero_documento: empleado?.numero_documento || '',
    nombres: empleado?.nombres || '',
    apellidos: empleado?.apellidos || '',
    telefono: empleado?.telefono || '',
    email: empleado?.email || '',
    cargo: empleado?.cargo || '',
    rol_id: empleado?.rol_id || '',
    usuario: empleado?.usuario || '',
    password: '',
    confirmar_password: '',
    activo: empleado?.activo ?? true,
  })
  const [mostrarPass, setMostrarPass] = useState(false)
  const [mostrarPass2, setMostrarPass2] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!esEdicion && form.password !== form.confirmar_password) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!esEdicion && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (esEdicion && form.password && form.password !== form.confirmar_password) {
      setError('Las contraseñas no coinciden')
      return
    }

    const payload = {
      codigo: form.codigo,
      tipo_documento: form.tipo_documento,
      numero_documento: form.numero_documento,
      nombres: form.nombres,
      apellidos: form.apellidos,
      telefono: form.telefono || null,
      email: form.email || null,
      cargo: form.cargo,
      rol_id: form.rol_id ? parseInt(form.rol_id) : null,
      usuario: form.usuario,
      activo: form.activo,
    }
    // Solo incluir password si se ingresó algo (edición) o siempre (creación)
    if (!esEdicion || form.password) {
      payload.password = form.password
    }

    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarEmpleado(empleado.id, payload)
      } else {
        await crearEmpleado(payload)
      }
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(e => `• ${e.loc?.slice(-1)[0] ?? ''}: ${e.msg}`).join('\n'))
      } else {
        setError(typeof detail === 'string' ? detail : 'Error al guardar empleado')
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
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {esEdicion ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <p className="text-xs text-gray-400">{esEdicion ? `ID: ${empleado.id}` : 'Complete todos los campos requeridos'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Fila: código y tipo/número doc */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="EMP-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo Doc. *</label>
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="PASS">Pasaporte</option>
                <option value="RUC">RUC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">N° Documento *</label>
              <input name="numero_documento" value={form.numero_documento} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="12345678" />
            </div>
          </div>

          {/* Nombres y apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombres *</label>
              <input name="nombres" value={form.nombres} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Juan Carlos" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Apellidos *</label>
              <input name="apellidos" value={form.apellidos} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="García Pérez" />
            </div>
          </div>

          {/* Teléfono, email y cargo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="999 888 777" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="correo@empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cargo *</label>
              <input name="cargo" value={form.cargo} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Grifero" />
            </div>
          </div>

          {/* Usuario y Rol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario *</label>
              <input name="usuario" value={form.usuario} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="j.garcia" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <Shield size={12} className="text-indigo-500" /> Rol del Sistema
              </label>
              <select name="rol_id" value={form.rol_id} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                <option value="">Sin rol asignado</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.descripcion || ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contraseñas */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              {esEdicion ? 'Cambiar Contraseña (dejar vacío para mantener actual)' : 'Contraseña de acceso *'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña {!esEdicion && '*'}</label>
                <div className="relative">
                  <input
                    name="password"
                    type={mostrarPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    required={!esEdicion}
                    minLength={!esEdicion ? 6 : undefined}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setMostrarPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar {!esEdicion && '*'}</label>
                <div className="relative">
                  <input
                    name="confirmar_password"
                    type={mostrarPass2 ? 'text' : 'password'}
                    value={form.confirmar_password}
                    onChange={handleChange}
                    required={!esEdicion}
                    className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                      form.confirmar_password && form.password !== form.confirmar_password
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setMostrarPass2(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {mostrarPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirmar_password && form.password !== form.confirmar_password && (
                  <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>
          </div>

          {/* Activo */}
          {esEdicion && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="sr-only" />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">{form.activo ? 'Empleado activo' : 'Empleado inactivo'}</span>
            </label>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {guardando
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando…</>
                : esEdicion ? 'Guardar cambios' : 'Crear empleado'
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
export default function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [roles, setRoles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState(null) // null = todos
  const [modalAbierto, setModalAbierto] = useState(false)
  const [empleadoEditar, setEmpleadoEditar] = useState(null)
  const [notificacion, setNotificacion] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)

  const mostrarNotif = (tipo, mensaje) => {
    setNotificacion({ tipo, mensaje })
    setTimeout(() => setNotificacion(null), 6000)
  }

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [emps, rols] = await Promise.all([getEmpleadosF(), getRoles()])
      setEmpleados(emps)
      setRoles(rols)
    } catch {
      mostrarNotif('error', 'Error al cargar empleados')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const handleDesactivar = async (emp) => {
    try {
      await desactivarEmpleado(emp.id)
      mostrarNotif('exito', `Empleado ${emp.nombres} ${emp.apellidos} desactivado exitosamente`)
      cargarDatos()
    } catch (err) {
      mostrarNotif('error', err.response?.data?.detail || 'Error al desactivar empleado')
    }
    setConfirmDesactivar(null)
  }

  const handleReactivar = async (emp) => {
    try {
      await actualizarEmpleado(emp.id, { activo: true })
      mostrarNotif('exito', `Empleado ${emp.nombres} ${emp.apellidos} reactivado exitosamente`)
      cargarDatos()
    } catch (err) {
      mostrarNotif('error', err.response?.data?.detail || 'Error al reactivar empleado')
    }
  }

  const handleGuardado = () => {
    setModalAbierto(false)
    setEmpleadoEditar(null)
    mostrarNotif('exito', empleadoEditar ? 'Empleado actualizado exitosamente' : 'Empleado creado exitosamente')
    cargarDatos()
  }

  // Filtrado
  const empleadosFiltrados = empleados.filter(e => {
    const texto = busqueda.toLowerCase()
    const coincideTexto = !texto ||
      e.nombres?.toLowerCase().includes(texto) ||
      e.apellidos?.toLowerCase().includes(texto) ||
      e.usuario?.toLowerCase().includes(texto) ||
      e.cargo?.toLowerCase().includes(texto) ||
      e.numero_documento?.includes(texto)
    const coincideActivo = filtroActivo === null || e.activo === filtroActivo
    return coincideTexto && coincideActivo
  })

  const rolColor = (nombre) => {
    const mapa = {
      admin: 'bg-purple-100 text-purple-700',
      supervisor: 'bg-blue-100 text-blue-700',
      grifero: 'bg-green-100 text-green-700',
    }
    return mapa[nombre?.toLowerCase()] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Notificación */}
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" size={28} />
            Gestión de Empleados
          </h1>
          <p className="text-sm text-gray-400 mt-1">Administra los empleados del sistema y sus roles de acceso</p>
        </div>
        <button
          onClick={() => { setEmpleadoEditar(null); setModalAbierto(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={18} /> Nuevo Empleado
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, usuario, cargo o documento…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex gap-2">
          {[null, true, false].map(val => {
            const labels = { null: 'Todos', true: 'Activos', false: 'Inactivos' }
            return (
              <button key={String(val)}
                onClick={() => setFiltroActivo(val)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filtroActivo === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {labels[String(val)]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No se encontraron empleados</p>
            <p className="text-sm mt-1">Ajusta los filtros o crea un nuevo empleado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Empleado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Documento</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cargo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {empleadosFiltrados.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                          {emp.nombres?.[0]}{emp.apellidos?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{emp.nombres} {emp.apellidos}</p>
                          <p className="text-xs text-gray-400">{emp.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs text-gray-400">{emp.tipo_documento} </span>{emp.numero_documento}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-700 text-xs bg-blue-50 rounded">
                      {emp.usuario}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.cargo}</td>
                    <td className="px-4 py-3">
                      {emp.rol_nombre
                        ? <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rolColor(emp.rol_nombre)}`}>{emp.rol_nombre}</span>
                        : <span className="text-gray-400 text-xs">Sin rol</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        emp.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEmpleadoEditar(emp); setModalAbierto(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                          title="Editar">
                          <Edit2 size={15} />
                        </button>
                        {emp.activo ? (
                          <button
                            onClick={() => setConfirmDesactivar(emp)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                            title="Desactivar">
                            <UserX size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivar(emp)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                            title="Reactivar">
                            <UserCheck size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen */}
      {!cargando && (
        <div className="flex gap-4 text-xs text-gray-400">
          <span>{empleados.filter(e => e.activo).length} activos</span>
          <span>·</span>
          <span>{empleados.filter(e => !e.activo).length} inactivos</span>
          <span>·</span>
          <span>{empleados.length} total</span>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalAbierto && (
        <ModalEmpleado
          empleado={empleadoEditar}
          roles={roles}
          onClose={() => { setModalAbierto(false); setEmpleadoEditar(null) }}
          onSave={handleGuardado}
        />
      )}

      {/* Confirmación desactivar */}
      {confirmDesactivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <UserX size={28} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">¿Desactivar empleado?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{confirmDesactivar.nombres} {confirmDesactivar.apellidos}</strong> no podrá ingresar al sistema.
              Podrás reactivarlo cuando desees.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDesactivar(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleDesactivar(confirmDesactivar)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
