import { useState } from 'react'
import { Plus } from 'lucide-react'
import { agregarVale } from '../../../utils/api'
import { ModalVale } from '../Modals/ModalVale'

export function TabVales({ turno, tiposVale, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const vales = turno.vales_caja ?? turno.vales ?? []

  const handleAgregar = async (data) => {
    try {
      await agregarVale(turno.id, {
        tipo_vale_id: Number(data.tipo_vale_id),
        monto: data.monto,
        beneficiario: data.beneficiario,
        autorizado_por: data.autorizado_por,
        numero_vale: data.numero_vale,
        observaciones: data.observaciones || null
      })
      onMensaje('Vale agregado correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar vale', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Vales</h3>
        {turno.estado_id === 1 && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Vale
          </button>
        )}
      </div>

      <div className="space-y-3">
        {vales.map(vale => (
          <div key={vale.id} className="card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{vale.numero_vale} — S/ {vale.monto}</p>
                <p className="text-sm text-gray-600">{vale.beneficiario}</p>
                <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                  {vale.estado}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ModalVale
          tiposVale={tiposVale}
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
    </div>
  )
}
