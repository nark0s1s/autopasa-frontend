import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function ModalVenta({ productos, onClose, onSubmit, ventaInicial = null }) {
  const [formData, setFormData] = useState({
    producto_id: '',
    cantidad: '',
    precio_unitario: ''
  })

  useEffect(() => {
    if (ventaInicial) {
      setFormData({
        producto_id: ventaInicial.producto_id != null ? String(ventaInicial.producto_id) : '',
        cantidad: ventaInicial.cantidad != null ? String(ventaInicial.cantidad) : '',
        precio_unitario:
          ventaInicial.precio_unitario != null ? String(ventaInicial.precio_unitario) : '',
      })
    } else {
      setFormData({
        producto_id: '',
        cantidad: '',
        precio_unitario: '',
      })
    }
  }, [ventaInicial])

  const total =
    formData.cantidad && formData.precio_unitario
      ? parseFloat(formData.cantidad) * parseFloat(formData.precio_unitario)
      : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const titulo = ventaInicial ? 'Editar venta de producto' : 'Nueva venta de producto'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Producto</label>
            <select
              className="input"
              value={formData.producto_id}
              onChange={e => {
                const prod = productos.find(p => p.id == e.target.value)
                setFormData({
                  ...formData,
                  producto_id: e.target.value,
                  precio_unitario: prod?.precio_venta || formData.precio_unitario
                })
              }}
              required
            >
              <option value="">Seleccione...</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio_venta}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Cantidad</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.cantidad}
              onChange={e => setFormData({...formData, cantidad: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Precio Unitario</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.precio_unitario}
              onChange={e => setFormData({...formData, precio_unitario: e.target.value})}
              required
            />
          </div>
          
          {total > 0 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">Total</p>
              <p className="text-2xl font-bold text-green-900">S/ {total.toFixed(2)}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {ventaInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
