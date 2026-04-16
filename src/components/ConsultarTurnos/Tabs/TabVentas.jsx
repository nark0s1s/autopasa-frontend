import { useState } from 'react'
import { Plus } from 'lucide-react'
import { agregarVentaProducto } from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalVenta } from '../Modals/ModalVenta'

export function TabVentas({ turno, productos, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)

  const handleAgregar = async (data) => {
    try {
      await agregarVentaProducto(turno.id, {
        producto_id: Number(data.producto_id),
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario
      })
      onMensaje('Venta agregada correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar venta', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ventas de Productos</h3>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Venta
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.ventas_producto?.map(venta => {
          const producto = productos.find(p => p.id === venta.producto_id)
          const subtotal =
            parseFloat(venta.cantidad) * parseFloat(venta.precio_unitario)
          return (
            <div key={venta.id} className="card p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{producto?.nombre || venta.nombre_producto || 'Producto'}</p>
                  <p className="text-sm text-gray-600">
                    {venta.cantidad} × S/ {venta.precio_unitario} = S/ {subtotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <ModalVenta
          productos={productos}
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
    </div>
  )
}
