import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { agregarVentaPOS, actualizarVentaPOS, eliminarVentaPOS } from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalPOS } from '../Modals/ModalPOS'

export function TabPOS({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [ventaPosEdicion, setVentaPosEdicion] = useState(null)
  const [posEliminar, setPosEliminar] = useState(null)

  const buildPayload = (data) => ({
    monto: parseFloat(data.monto),
    numero_operacion: String(data.numero_operacion ?? '').trim() || 'S/N',
    tipo_tarjeta: data.tipo_tarjeta,
    numero_lote: data.numero_lote || null,
    terminal_id: data.terminal_id || null,
    autorizacion: data.autorizacion || null,
  })

  const handleGuardarPOS = async (data) => {
    const editando = Boolean(ventaPosEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarVentaPOS(ventaPosEdicion.id, payload)
        onMensaje('Venta POS actualizada correctamente')
      } else {
        await agregarVentaPOS(turno.id, payload)
        onMensaje('Venta POS agregada correctamente')
      }
      setShowModal(false)
      setVentaPosEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar venta POS' : 'Error al agregar venta POS', 'error')
    }
  }

  const handleConfirmarEliminarPOS = async () => {
    if (!posEliminar?.id) return
    try {
      await eliminarVentaPOS(posEliminar.id)
      onMensaje('Venta POS eliminada correctamente')
      setPosEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar venta POS', 'error')
    }
  }

  const abrirNueva = () => {
    setVentaPosEdicion(null)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ventas con Tarjeta (POS)</h3>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={abrirNueva} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Venta POS
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.ventas_pos?.map(venta => (
          <div key={venta.id} className="card p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-medium">S/ {venta.monto}</p>
                <p className="text-sm text-gray-600">
                  {venta.tipo_tarjeta} • Op: {venta.numero_operacion}
                </p>
                {venta.numero_lote && (
                  <p className="text-xs text-gray-500">Lote: {venta.numero_lote}</p>
                )}
              </div>
              {turnoGriferoEsAbierto(turno) && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setVentaPosEdicion(venta)
                      setShowModal(true)
                    }}
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosEliminar(venta)}
                    className="btn btn-danger btn-sm inline-flex items-center gap-1"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalPOS
          key={ventaPosEdicion?.id ?? 'nueva'}
          ventaInicial={ventaPosEdicion}
          onClose={() => {
            setShowModal(false)
            setVentaPosEdicion(null)
          }}
          onSubmit={handleGuardarPOS}
        />
      )}

      {posEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar venta POS</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar la operación <strong>{posEliminar.numero_operacion}</strong> por{' '}
              <strong>S/ {posEliminar.monto}</strong>? Se actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setPosEliminar(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={handleConfirmarEliminarPOS}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
