import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { agregarVale, actualizarVale, eliminarVale } from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalVale } from '../Modals/ModalVale'

export function TabVales({ turno, tiposVale, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [valeEdicion, setValeEdicion] = useState(null)
  const [valeEliminar, setValeEliminar] = useState(null)
  const vales = turno.vales_caja ?? turno.vales ?? []

  const buildPayload = (data) => ({
    tipo_vale_id: Number(data.tipo_vale_id),
    monto: parseFloat(data.monto),
    beneficiario: data.beneficiario?.trim() || '',
    autorizado_por: data.autorizado_por?.trim() || '',
    numero_vale: data.numero_vale?.trim() || '',
    observaciones: data.observaciones?.trim() ? data.observaciones.trim() : null,
  })

  const handleGuardarVale = async (data) => {
    const editando = Boolean(valeEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarVale(valeEdicion.id, payload)
        onMensaje('Vale actualizado correctamente')
      } else {
        await agregarVale(turno.id, payload)
        onMensaje('Vale agregado correctamente')
      }
      setShowModal(false)
      setValeEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar vale' : 'Error al agregar vale', 'error')
    }
  }

  const handleConfirmarEliminarVale = async () => {
    if (!valeEliminar?.id) return
    try {
      await eliminarVale(valeEliminar.id)
      onMensaje('Vale eliminado correctamente')
      setValeEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar vale', 'error')
    }
  }

  const abrirNuevo = () => {
    setValeEdicion(null)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Vales</h3>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={abrirNuevo} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Vale
          </button>
        )}
      </div>

      <div className="space-y-3">
        {vales.map(vale => (
          <div key={vale.id} className="card p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-medium">{vale.numero_vale} — S/ {vale.monto}</p>
                <p className="text-sm text-gray-600">{vale.beneficiario}</p>
                {vale.observaciones && (
                  <p className="text-sm text-gray-500 mt-0.5">{vale.observaciones}</p>
                )}
                <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                  {vale.estado}
                </span>
              </div>
              {turnoGriferoEsAbierto(turno) && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setValeEdicion(vale)
                      setShowModal(true)
                    }}
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setValeEliminar(vale)}
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
        {vales.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay vales en este turno.</p>
        )}
      </div>

      {showModal && (
        <ModalVale
          key={valeEdicion?.id ?? 'nuevo'}
          tiposVale={tiposVale}
          valeInicial={valeEdicion}
          onClose={() => {
            setShowModal(false)
            setValeEdicion(null)
          }}
          onSubmit={handleGuardarVale}
        />
      )}

      {valeEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar vale</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el vale <strong>{valeEliminar.numero_vale}</strong> por{' '}
              <strong>S/ {valeEliminar.monto}</strong>? Se actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setValeEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger flex-1"
                onClick={handleConfirmarEliminarVale}
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
