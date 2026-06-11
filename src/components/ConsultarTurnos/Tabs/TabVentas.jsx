import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  agregarVentaProducto,
  actualizarVentaProducto,
  eliminarVentaProducto,
} from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalVenta } from '../Modals/ModalVenta'

export function TabVentas({ turno, productos, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [ventaEdicion, setVentaEdicion] = useState(null)
  const [ventaEliminar, setVentaEliminar] = useState(null)

  const buildPayload = (data) => ({
    producto_id: Number(data.producto_id),
    cantidad: parseFloat(data.cantidad),
    precio_unitario: parseFloat(data.precio_unitario),
  })

  const handleGuardarVenta = async (data) => {
    const editando = Boolean(ventaEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarVentaProducto(ventaEdicion.id, payload)
        onMensaje('Venta actualizada correctamente')
      } else {
        await agregarVentaProducto(turno.id, payload)
        onMensaje('Venta agregada correctamente')
      }
      setShowModal(false)
      setVentaEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar venta' : 'Error al agregar venta', 'error')
    }
  }

  const handleConfirmarEliminarVenta = async () => {
    if (!ventaEliminar?.id) return
    try {
      await eliminarVentaProducto(ventaEliminar.id)
      onMensaje('Venta eliminada correctamente')
      setVentaEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar venta', 'error')
    }
  }

  const abrirNueva = () => {
    setVentaEdicion(null)
    setShowModal(true)
  }

  const nombreProducto = (venta) => {
    const producto = productos.find((p) => p.id === venta.producto_id)
    return producto?.nombre || venta.nombre_producto || 'Producto'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ventas de Productos</h3>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={abrirNueva} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Venta
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.ventas_producto?.map(venta => {
          const subtotal =
            parseFloat(venta.cantidad) * parseFloat(venta.precio_unitario)
          return (
            <div key={venta.id} className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium">{nombreProducto(venta)}</p>
                  <p className="text-sm text-gray-600">
                    {venta.cantidad} × S/ {venta.precio_unitario} = S/ {subtotal.toFixed(2)}
                  </p>
                </div>
                {turnoGriferoEsAbierto(turno) && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setVentaEdicion(venta)
                        setShowModal(true)
                      }}
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVentaEliminar(venta)}
                      className="btn btn-danger btn-sm inline-flex items-center gap-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {(!turno.ventas_producto || turno.ventas_producto.length === 0) && (
          <p className="text-sm text-gray-500 text-center py-8">No hay ventas de productos en este turno.</p>
        )}
      </div>

      {showModal && (
        <ModalVenta
          key={ventaEdicion?.id ?? 'nueva'}
          productos={productos}
          ventaInicial={ventaEdicion}
          onClose={() => {
            setShowModal(false)
            setVentaEdicion(null)
          }}
          onSubmit={handleGuardarVenta}
        />
      )}

      {ventaEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar venta</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar la venta de <strong>{nombreProducto(ventaEliminar)}</strong> por{' '}
              <strong>
                S/{' '}
                {(
                  parseFloat(ventaEliminar.cantidad) * parseFloat(ventaEliminar.precio_unitario)
                ).toFixed(2)}
              </strong>
              ? Se actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setVentaEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger flex-1"
                onClick={handleConfirmarEliminarVenta}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
