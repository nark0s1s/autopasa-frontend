import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  agregarTransferenciaBancaria,
  actualizarTransferenciaBancaria,
  eliminarTransferenciaBancaria,
  getClientes,
  getBancos,
} from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalTransferenciaBancaria } from '../Modals/ModalTransferenciaBancaria'

export function TabTransferenciasBancarias({ turno, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [lineaEdicion, setLineaEdicion] = useState(null)
  const [lineaEliminar, setLineaEliminar] = useState(null)
  const [clientesPorId, setClientesPorId] = useState({})
  const [bancosPorId, setBancosPorId] = useState({})

  const lineas = turno.transferencias_bancarias ?? []

  useEffect(() => {
    let cancelled = false
    Promise.all([getClientes(true), getBancos(true)])
      .then(([cls, bks]) => {
        if (cancelled) return
        const cm = {}
        ;(cls || []).forEach((c) => {
          cm[c.id] = c
        })
        setClientesPorId(cm)
        const bm = {}
        ;(bks || []).forEach((b) => {
          bm[b.id] = b
        })
        setBancosPorId(bm)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const nombreCliente = (id) => {
    if (id == null) return '—'
    return clientesPorId[id]?.razon_social || `Cliente #${id}`
  }

  const nombreBanco = (row) => {
    if (row.banco_display) return row.banco_display
    if (row.banco_id != null && bancosPorId[row.banco_id]) return bancosPorId[row.banco_id].nombre
    if (row.banco_otro_nombre?.trim()) return row.banco_otro_nombre.trim()
    return '—'
  }

  const buildPayload = (data) => ({
    cliente_id: data.cliente_id ?? null,
    banco_id: data.banco_id ?? null,
    banco_otro_nombre: data.banco_otro_nombre ?? null,
    monto: data.monto,
    observaciones: data.observaciones ?? null,
  })

  const handleGuardar = async (data) => {
    const editando = Boolean(lineaEdicion?.id)
    try {
      const payload = buildPayload(data)
      if (editando) {
        await actualizarTransferenciaBancaria(lineaEdicion.id, payload)
        onMensaje('Transferencia bancaria actualizada')
      } else {
        await agregarTransferenciaBancaria(turno.id, payload)
        onMensaje('Transferencia bancaria registrada')
      }
      setShowModal(false)
      setLineaEdicion(null)
      onReload()
    } catch {
      onMensaje(editando ? 'Error al actualizar' : 'Error al registrar transferencia', 'error')
    }
  }

  const handleConfirmarEliminar = async () => {
    if (!lineaEliminar?.id) return
    try {
      await eliminarTransferenciaBancaria(lineaEliminar.id)
      onMensaje('Transferencia eliminada')
      setLineaEliminar(null)
      onReload()
    } catch {
      onMensaje('Error al eliminar transferencia', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Transferencias bancarias</h3>
          <p className="text-sm text-gray-600 mt-1">
            Depósitos de clientes a cuenta de la empresa. Se restan del efectivo esperado en caja.
          </p>
        </div>
        {turnoGriferoEsAbierto(turno) && (
          <button
            type="button"
            onClick={() => {
              setLineaEdicion(null)
              setShowModal(true)
            }}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </button>
        )}
      </div>

      {lineas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No hay transferencias registradas.</p>
      ) : (
        <div className="space-y-3">
          {lineas.map((row) => (
            <div key={row.id} className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium text-gray-900">S/ {parseFloat(row.monto || 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-700 mt-0.5">Cliente: {nombreCliente(row.cliente_id)}</p>
                  <p className="text-sm text-gray-700">Banco: {nombreBanco(row)}</p>
                  {row.observaciones ? (
                    <p className="text-xs text-gray-500 mt-1">{row.observaciones}</p>
                  ) : null}
                </div>
                {turnoGriferoEsAbierto(turno) && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                      title="Editar"
                      onClick={() => {
                        setLineaEdicion(row)
                        setShowModal(true)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm inline-flex items-center gap-1"
                      title="Eliminar"
                      onClick={() => setLineaEliminar(row)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalTransferenciaBancaria
          key={lineaEdicion?.id ?? 'nueva'}
          transferenciaInicial={lineaEdicion}
          onClose={() => {
            setShowModal(false)
            setLineaEdicion(null)
          }}
          onSubmit={handleGuardar}
        />
      )}

      {lineaEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar transferencia</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar la transferencia por <strong>S/ {lineaEliminar.monto}</strong>? Se actualizarán los
              totales del turno.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setLineaEliminar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={handleConfirmarEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
