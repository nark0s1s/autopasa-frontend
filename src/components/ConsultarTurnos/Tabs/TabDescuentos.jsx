import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getClientes,
  agregarDescuentoTurno,
  actualizarDescuentoTurno,
  eliminarDescuentoTurno,
} from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalDescuentoTurno } from '../Modals/ModalDescuentoTurno'

export function TabDescuentos({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [descuentoEdicion, setDescuentoEdicion] = useState(null)
  const [descuentoEliminar, setDescuentoEliminar] = useState(null)
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

  const montoDescuentoDe = (d) => {
    const mv = parseFloat(d.monto_venta || 0)
    const pct = parseFloat(d.porcentaje_descuento || 0)
    return (mv * pct) / 100
  }

  const handleGuardarDescuento = async (payload) => {
    const editando = Boolean(descuentoEdicion?.id)
    try {
      if (editando) {
        await actualizarDescuentoTurno(descuentoEdicion.id, payload)
        onMensaje('Descuento actualizado correctamente')
      } else {
        await agregarDescuentoTurno(turno.id, payload)
        onMensaje('Descuento aplicado registrado correctamente')
      }
      setShowModal(false)
      setDescuentoEdicion(null)
      onReload()
    } catch (error) {
      onMensaje(editando ? 'Error al actualizar descuento' : 'Error al registrar descuento', 'error')
    }
  }

  const handleConfirmarEliminarDescuento = async () => {
    if (!descuentoEliminar?.id) return
    try {
      await eliminarDescuentoTurno(descuentoEliminar.id)
      onMensaje('Descuento eliminado correctamente')
      setDescuentoEliminar(null)
      onReload()
    } catch (error) {
      onMensaje('Error al eliminar descuento', 'error')
    }
  }

  const abrirNuevo = () => {
    setDescuentoEdicion(null)
    setShowModal(true)
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
          <button type="button" onClick={abrirNuevo} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo descuento
          </button>
        )}
      </div>

      <div className="space-y-3">
        {descuentos.map((d) => {
          const mv = parseFloat(d.monto_venta || 0)
          const pct = parseFloat(d.porcentaje_descuento || 0)
          const montoDesc = montoDescuentoDe(d)
          const esSoloMontoRegistrado = pct >= 99.99 && pct <= 100.01
          return (
            <div key={d.id} className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
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
                {turnoGriferoEsAbierto(turno) && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDescuentoEdicion(d)
                        setShowModal(true)
                      }}
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescuentoEliminar(d)}
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
        {descuentos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay descuentos en este turno.</p>
        )}
      </div>

      {showModal && (
        <ModalDescuentoTurno
          key={descuentoEdicion?.id ?? 'nuevo'}
          descuentoInicial={descuentoEdicion}
          onClose={() => {
            setShowModal(false)
            setDescuentoEdicion(null)
          }}
          onSubmit={handleGuardarDescuento}
        />
      )}

      {descuentoEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar descuento</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el descuento por{' '}
              <strong>S/ {montoDescuentoDe(descuentoEliminar).toFixed(2)}</strong>
              {descuentoEliminar.motivo ? <> (doc. ref. {descuentoEliminar.motivo})</> : null}? Se
              actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setDescuentoEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger flex-1"
                onClick={handleConfirmarEliminarDescuento}
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
