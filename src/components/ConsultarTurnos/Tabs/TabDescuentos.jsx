import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getClientes, agregarDescuentoTurno } from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalDescuentoTurno } from '../Modals/ModalDescuentoTurno'

export function TabDescuentos({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [clientesPorId, setClientesPorId] = useState({})
  const descuentos = turno.descuentos_aplicados ?? []

  useEffect(() => {
    let cancelled = false
    getClientes(true)
      .then((list) => {
        if (cancelled || !list) return
        const m = {}
        list.forEach((cl) => {
          m[cl.id] = cl
        })
        setClientesPorId(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const nombreCliente = (id) => {
    if (id == null) return '—'
    const cl = clientesPorId[id]
    return cl ? cl.razon_social : `Cliente #${id}`
  }

  const handleAgregar = async (payload) => {
    try {
      await agregarDescuentoTurno(turno.id, payload)
      onMensaje('Descuento aplicado registrado correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al registrar descuento', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Descuentos aplicados</h3>
          <p className="text-sm text-gray-600 mt-1">
            Se guardan en el turno de grifero y reducen el efectivo esperado según monto de descuento.
          </p>
        </div>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo descuento
          </button>
        )}
      </div>

      <div className="space-y-3">
        {descuentos.map((d) => {
          const mv = parseFloat(d.monto_venta || 0)
          const pct = parseFloat(d.porcentaje_descuento || 0)
          const montoDesc = (mv * pct) / 100
          const esSoloMontoRegistrado = pct >= 99.99 && pct <= 100.01
          return (
            <div key={d.id} className="card p-4">
              <p className="font-medium">{nombreCliente(d.cliente_id)}</p>
              {d.motivo ? (
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="text-gray-500">Doc. ref.:</span> {d.motivo}
                </p>
              ) : null}
              {esSoloMontoRegistrado ? (
                <p className="text-sm text-gray-700 mt-1">
                  Descuento{' '}
                  <span className="font-semibold text-red-600">S/ {montoDesc.toFixed(2)}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  Venta S/ {mv.toFixed(2)} · {pct}% → Descuento{' '}
                  <span className="font-semibold text-red-600">S/ {montoDesc.toFixed(2)}</span>
                </p>
              )}
            </div>
          )
        })}
        {descuentos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay descuentos en este turno.</p>
        )}
      </div>

      {showModal && (
        <ModalDescuentoTurno
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}
    </div>
  )
}
