import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  agregarVentaGnv,
  actualizarVentaGnv,
  eliminarVentaGnv,
  agregarFinanciacionGnv,
  actualizarFinanciacionGnv,
  eliminarFinanciacionGnv,
} from '../../../utils/api'
import { ModalGNV } from '../Modals/ModalGNV'

export function TabGNV({ turno, onReload, onMensaje }) {
  const [subTab, setSubTab] = useState('venta')
  const [modalVariant, setModalVariant] = useState(null)
  const [filaEdicion, setFilaEdicion] = useState(null)
  const [eliminarVenta, setEliminarVenta] = useState(null)
  const [eliminarFin, setEliminarFin] = useState(null)

  const ventas = turno.ventas_gnv ?? []
  const fins = turno.financiaciones_gnv ?? []

  const totalVentaGnv = useMemo(
    () => ventas.reduce((s, r) => s + parseFloat(r.venta_total_soles || 0), 0),
    [ventas]
  )
  const totalFinGnv = useMemo(
    () => fins.reduce((s, r) => s + parseFloat(r.monto_soles || 0), 0),
    [fins]
  )

  const guardarVenta = async (data) => {
    const editando = Boolean(filaEdicion?.id)
    const payload = {
      venta_total_soles: parseFloat(data.venta_total_soles),
      observaciones: data.observaciones || null,
    }
    try {
      if (editando) {
        await actualizarVentaGnv(filaEdicion.id, payload)
        onMensaje('Venta GNV actualizada correctamente')
      } else {
        await agregarVentaGnv(turno.id, payload)
        onMensaje('Venta GNV registrada correctamente')
      }
      setModalVariant(null)
      setFilaEdicion(null)
      onReload()
    } catch {
      onMensaje(editando ? 'Error al actualizar venta GNV' : 'Error al registrar venta GNV', 'error')
    }
  }

  const guardarFin = async (data) => {
    const editando = Boolean(filaEdicion?.id)
    const payload = {
      monto_soles: parseFloat(data.monto_soles),
      observaciones: data.observaciones || null,
    }
    try {
      if (editando) {
        await actualizarFinanciacionGnv(filaEdicion.id, payload)
        onMensaje('Financiación GNV actualizada correctamente')
      } else {
        await agregarFinanciacionGnv(turno.id, payload)
        onMensaje('Financiación GNV registrada correctamente')
      }
      setModalVariant(null)
      setFilaEdicion(null)
      onReload()
    } catch {
      onMensaje(
        editando ? 'Error al actualizar financiación GNV' : 'Error al registrar financiación GNV',
        'error'
      )
    }
  }

  const confirmEliminarVenta = async () => {
    if (!eliminarVenta?.id) return
    try {
      await eliminarVentaGnv(eliminarVenta.id)
      onMensaje('Venta GNV eliminada correctamente')
      setEliminarVenta(null)
      onReload()
    } catch {
      onMensaje('Error al eliminar venta GNV', 'error')
    }
  }

  const confirmEliminarFin = async () => {
    if (!eliminarFin?.id) return
    try {
      await eliminarFinanciacionGnv(eliminarFin.id)
      onMensaje('Financiación GNV eliminada correctamente')
      setEliminarFin(null)
      onReload()
    } catch {
      onMensaje('Error al eliminar financiación GNV', 'error')
    }
  }

  return (
    <div>
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex -mb-px gap-1">
          <button
            type="button"
            onClick={() => setSubTab('venta')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === 'venta'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Venta GNV
          </button>
          <button
            type="button"
            onClick={() => setSubTab('financiacion')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subTab === 'financiacion'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Financiación GNV
          </button>
        </nav>
      </div>

      {subTab === 'venta' && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-semibold">Venta GNV</h3>
              <p className="text-sm text-gray-600">
                Total ventas GNV:{' '}
                <span className="font-semibold text-teal-700">S/ {totalVentaGnv.toFixed(2)}</span>
              </p>
            </div>
            {turno.estado_id === 1 && (
              <button
                type="button"
                onClick={() => {
                  setFilaEdicion(null)
                  setModalVariant('venta')
                }}
                className="btn btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva venta GNV
              </button>
            )}
          </div>

          <div className="space-y-3">
            {ventas.map((row) => (
              <div key={row.id} className="card p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium">S/ {row.venta_total_soles}</p>
                    {row.observaciones && (
                      <p className="text-sm text-gray-600 mt-1">{row.observaciones}</p>
                    )}
                  </div>
                  {turno.estado_id === 1 && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setFilaEdicion(row)
                          setModalVariant('venta')
                        }}
                        className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEliminarVenta(row)}
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
        </div>
      )}

      {subTab === 'financiacion' && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-semibold">Financiación GNV</h3>
              <p className="text-sm text-gray-600">
                Total financiación GNV:{' '}
                <span className="font-semibold text-cyan-800">S/ {totalFinGnv.toFixed(2)}</span>
              </p>
            </div>
            {turno.estado_id === 1 && (
              <button
                type="button"
                onClick={() => {
                  setFilaEdicion(null)
                  setModalVariant('financiacion')
                }}
                className="btn btn-primary"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva financiación GNV
              </button>
            )}
          </div>

          <div className="space-y-3">
            {fins.map((row) => (
              <div key={row.id} className="card p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-medium">S/ {row.monto_soles}</p>
                    {row.observaciones && (
                      <p className="text-sm text-gray-600 mt-1">{row.observaciones}</p>
                    )}
                  </div>
                  {turno.estado_id === 1 && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setFilaEdicion(row)
                          setModalVariant('financiacion')
                        }}
                        className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEliminarFin(row)}
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
        </div>
      )}

      {modalVariant === 'venta' && (
        <ModalGNV
          key={filaEdicion?.id ?? 'nueva-v'}
          variant="venta"
          filaInicial={filaEdicion}
          onClose={() => {
            setModalVariant(null)
            setFilaEdicion(null)
          }}
          onSubmit={guardarVenta}
        />
      )}
      {modalVariant === 'financiacion' && (
        <ModalGNV
          key={filaEdicion?.id ?? 'nueva-f'}
          variant="financiacion"
          filaInicial={filaEdicion}
          onClose={() => {
            setModalVariant(null)
            setFilaEdicion(null)
          }}
          onSubmit={guardarFin}
        />
      )}

      {eliminarVenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar venta GNV</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el registro por <strong>S/ {eliminarVenta.venta_total_soles}</strong>? Se
              actualizarán los totales del turno.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setEliminarVenta(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={confirmEliminarVenta}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {eliminarFin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar financiación GNV</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el registro por <strong>S/ {eliminarFin.monto_soles}</strong>? Se actualizarán
              los totales del turno.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setEliminarFin(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger flex-1" onClick={confirmEliminarFin}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
