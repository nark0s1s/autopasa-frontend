import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Edit2, ToggleLeft, ToggleRight, X, Search } from 'lucide-react'
import { getProductosAdmin, crearProducto, actualizarProducto, getCategoriasProducto } from '../utils/api'

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
// Modal Crear / Editar Producto
// ──────────────────────────────────────────────
function ModalProducto({ producto, categorias, onClose, onSave }) {
  const esEdicion = !!producto
  const [form, setForm] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    categoria_id: producto?.categoria_id || '',
    subcategoria: producto?.subcategoria || '',
    precio_venta: producto?.precio_venta ?? '',
    precio_compra: producto?.precio_compra ?? '',
    unidad_medida: producto?.unidad_medida || 'galón',
    stock_actual: producto?.stock_actual ?? 0,
    activo: producto?.activo ?? true,
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
      categoria_id: parseInt(form.categoria_id),
      precio_venta: parseFloat(form.precio_venta),
      precio_compra: form.precio_compra !== '' ? parseFloat(form.precio_compra) : null,
      stock_actual: parseFloat(form.stock_actual) || 0,
    }

    setGuardando(true)
    try {
      if (esEdicion) {
        await actualizarProducto(producto.id, payload)
      } else {
        await crearProducto(payload)
      }
      onSave()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(e => `• ${e.loc?.slice(-1)[0] ?? ''}: ${e.msg}`).join('\n'))
      } else {
        setError(typeof detail === 'string' ? detail : 'Error al guardar producto')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Package size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-xs text-gray-400">
                {esEdicion ? `ID: ${producto.id}` : 'Complete todos los campos requeridos'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Código y nombre */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Código *</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="PROD-001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Gasohol 90" />
            </div>
          </div>

          {/* Categoría y subcategoría */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría *</label>
              <select name="categoria_id" value={form.categoria_id} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="">Seleccionar categoría...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subcategoría</label>
              <input name="subcategoria" value={form.subcategoria} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Opcional" />
            </div>
          </div>

          {/* Precios y unidad */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio Venta (S/) *</label>
              <input name="precio_venta" type="number" step="0.01" min="0" value={form.precio_venta} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio Compra (S/)</label>
              <input name="precio_compra" type="number" step="0.01" min="0" value={form.precio_compra} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad de Medida *</label>
              <select name="unidad_medida" value={form.unidad_medida} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="galón">Galón</option>
                <option value="litro">Litro</option>
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo</option>
                <option value="caja">Caja</option>
              </select>
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock Actual</label>
              <input name="stock_actual" type="number" step="0.01" min="0" value={form.stock_actual} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0" />
            </div>
            {esEdicion && (
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-gray-300'} relative`}>
                    <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="sr-only" />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.activo ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{form.activo ? 'Producto activo' : 'Inactivo'}</span>
                </label>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {guardando
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando…</>
                : esEdicion ? 'Guardar cambios' : 'Crear producto'
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
export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState(null)
  const [filtroCat, setFiltroCat] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditar, setProductoEditar] = useState(null)
  const [notificacion, setNotificacion] = useState(null)

  const mostrarNotif = (tipo, mensaje) => {
    setNotificacion({ tipo, mensaje })
    setTimeout(() => setNotificacion(null), 6000)
  }

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [prods, cats] = await Promise.all([getProductosAdmin(), getCategoriasProducto()])
      setProductos(prods)
      setCategorias(cats)
    } catch {
      mostrarNotif('error', 'Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const handleToggleActivo = async (prod) => {
    try {
      await actualizarProducto(prod.id, { ...prod, activo: !prod.activo })
      mostrarNotif('exito', `Producto ${prod.nombre} ${!prod.activo ? 'activado' : 'desactivado'}`)
      cargarDatos()
    } catch (err) {
      mostrarNotif('error', err.response?.data?.detail || 'Error al cambiar estado')
    }
  }

  const handleGuardado = () => {
    setModalAbierto(false)
    setProductoEditar(null)
    mostrarNotif('exito', productoEditar ? 'Producto actualizado' : 'Producto creado exitosamente')
    cargarDatos()
  }

  const categoriaNombre = (id) => categorias.find(c => c.id === id)?.nombre || '—'

  const productosFiltrados = productos.filter(p => {
    const texto = busqueda.toLowerCase()
    const coincideTexto = !texto ||
      p.nombre?.toLowerCase().includes(texto) ||
      p.codigo?.toLowerCase().includes(texto) ||
      p.subcategoria?.toLowerCase().includes(texto)
    const coincideActivo = filtroActivo === null || p.activo === filtroActivo
    const coincideCat = !filtroCat || p.categoria_id === parseInt(filtroCat)
    return coincideTexto && coincideActivo && coincideCat
  })

  const formatPrecio = (v) => v !== null && v !== undefined ? `S/ ${parseFloat(v).toFixed(2)}` : '—'

  return (
    <div className="p-6 space-y-6">
      <Notificacion notificacion={notificacion} onClose={() => setNotificacion(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-indigo-600" size={28} />
            Gestión de Productos
          </h1>
          <p className="text-sm text-gray-400 mt-1">Administra el catálogo de productos y combustibles</p>
        </div>
        <button
          onClick={() => { setProductoEditar(null); setModalAbierto(true) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, código o subcategoría…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <select
          value={filtroCat}
          onChange={e => setFiltroCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div className="flex gap-2">
          {[null, true, false].map(val => {
            const labels = { null: 'Todos', true: 'Activos', false: 'Inactivos' }
            return (
              <button key={String(val)}
                onClick={() => setFiltroActivo(val)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filtroActivo === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
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
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No se encontraron productos</p>
            <p className="text-sm mt-1">Ajusta los filtros o crea un nuevo producto</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoría</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Subcategoría</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">P. Venta</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">P. Compra</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Unidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productosFiltrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700 bg-indigo-50/50">{p.codigo}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        {categoriaNombre(p.categoria_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.subcategoria || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatPrecio(p.precio_venta)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatPrecio(p.precio_compra)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{p.unidad_medida}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">
                      {parseFloat(p.stock_actual || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setProductoEditar(p); setModalAbierto(true) }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                          title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(p)}
                          className={`p-1.5 rounded-lg transition-colors ${p.activo
                            ? 'hover:bg-red-50 text-red-400 hover:text-red-600'
                            : 'hover:bg-green-50 text-green-500 hover:text-green-700'}`}
                          title={p.activo ? 'Desactivar' : 'Activar'}>
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

      {/* Resumen */}
      {!cargando && (
        <div className="flex gap-4 text-xs text-gray-400">
          <span>{productos.filter(p => p.activo).length} activos</span>
          <span>·</span>
          <span>{productos.filter(p => !p.activo).length} inactivos</span>
          <span>·</span>
          <span>{productos.length} total</span>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalProducto
          producto={productoEditar}
          categorias={categorias}
          onClose={() => { setModalAbierto(false); setProductoEditar(null) }}
          onSave={handleGuardado}
        />
      )}
    </div>
  )
}
