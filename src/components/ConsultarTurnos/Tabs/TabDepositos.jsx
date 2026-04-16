import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { agregarDeposito, actualizarDeposito, eliminarDeposito } from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalDeposito } from '../Modals/ModalDeposito'

export function TabDepositos({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [depositoEdicion, setDepositoEdicion] = useState(null)
  const [depositoEliminar, setDepositoEliminar] = useState(null)
  const depositos = turno.depositos_caja ?? turno.depositos ?? []

  const buildPayload = (data) => ({
    monto: parseFloat(data.monto),
    recibido_por: data.recibido_por?.trim() ? data.recibido_por.trim() : null,
    numero_comprobante: data.numero_comprobante?.trim() ? data.numero_comprobante.trim() : null,
    observaciones: data.observaciones?.trim() ? data.observaciones.trim() : null,
  })

  const handleGuardarDeposito = async (data) => {
    const editando = Boolean(depositoEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarDeposito(depositoEdicion.id, payload)
        onMensaje('Depósito actualizado correctamente')
      } else {
        await agregarDeposito(turno.id, payload)
        onMensaje('Depósito agregado correctamente')
      }
      setShowModal(false)
      setDepositoEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar depósito' : 'Error al agregar depósito', 'error')
    }
  }

  const handleConfirmarEliminarDeposito = async () => {
    if (!depositoEliminar?.id) return
    try {
      await eliminarDeposito(depositoEliminar.id)
      onMensaje('Depósito eliminado correctamente')
      setDepositoEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar depósito', 'error')
    }
  }

  const abrirNuevo = () => {
    setDepositoEdicion(null)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Depósitos en Caja</h3>
          <p className="text-sm text-gray-600 mt-1">
            Se restan del efectivo esperado del turno.
          </p>
        </div>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={abrirNuevo} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Depósito
          </button>
        )}
      </div>

      <div className="space-y-3">
        {depositos.map(deposito => (
          <div key={deposito.id} className="card p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-medium">S/ {deposito.monto}</p>
                {deposito.numero_comprobante && (
                  <p className="text-sm text-gray-600">Comprobante: {deposito.numero_comprobante}</p>
                )}
                {deposito.observaciones && (
                  <p className="text-sm text-gray-600">{deposito.observaciones}</p>
                )}
                {deposito.recibido_por && (
                  <p className="text-xs text-gray-500">Recibido por: {deposito.recibido_por}</p>
                )}
              </div>
              {turnoGriferoEsAbierto(turno) && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositoEdicion(deposito)
                      setShowModal(true)
                    }}
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositoEliminar(deposito)}
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
        <ModalDeposito
          key={depositoEdicion?.id ?? 'nuevo'}
          depositoInicial={depositoEdicion}
          onClose={() => {
            setShowModal(false)
            setDepositoEdicion(null)
          }}
          onSubmit={handleGuardarDeposito}
        />
      )}

      {depositoEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar depósito</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el depósito por <strong>S/ {depositoEliminar.monto}</strong>
              {depositoEliminar.numero_comprobante
                ? <> (comprobante {depositoEliminar.numero_comprobante})</>
                : null}
              ? Se actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setDepositoEliminar(null)}
              >
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={handleConfirmarEliminarDeposito}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
