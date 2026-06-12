import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getClientes,
  agregarVentaGuiaCreditoTurno,
  agregarVentaGuiaRemisionTurno,
  marcarGuiaCreditoPagadoTurno,
  marcarGuiaRemisionPagadoTurno,
  actualizarVentaGuiaCreditoTurno,
  eliminarVentaGuiaCreditoTurno,
  actualizarVentaGuiaRemisionTurno,
  eliminarVentaGuiaRemisionTurno,
} from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalLineaGuiaTurno } from '../Modals/ModalLineaGuiaTurno'

export function TabVentasGuia({ turno, tipo, onReload, onMensaje }) {
  const esCredito = tipo === 'credito'
  const [showModal, setShowModal] = useState(false)
  const [lineaEdicion, setLineaEdicion] = useState(null)
  const [lineaEliminar, setLineaEliminar] = useState(null)
  const [clientesPorId, setClientesPorId] = useState({})

  const lineas = esCredito
    ? (turno.ventas_guia_credito ?? turno.ventas_credito ?? [])
    : (turno.ventas_guia_remision ?? [])

  const titulo = esCredito ? 'Guía de crédito' : 'Guía de remisión'
  const tituloModal = esCredito ? 'Nueva venta con guía de crédito' : 'Nueva venta con guía de remisión'

  const numerosDocumentoOcupados = useMemo(() => {
    const cred = turno.ventas_guia_credito ?? turno.ventas_credito ?? []
    const rem = turno.ventas_guia_remision ?? []
    return [...cred, ...rem]
      .filter((l) => l.id !== lineaEdicion?.id)
      .map((l) => (l.numero_documento || '').trim().toLowerCase())
      .filter(Boolean)
  }, [turno, lineaEdicion])

  const mensajeErrorApi = (error, fallback) => {
    const det = error?.response?.data?.detail
    return typeof det === 'string' ? det : fallback
  }

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

  const buildUpdateBody = (payload) => ({
    cliente_id: payload.cliente_id,
    monto: payload.monto,
    numero_documento: payload.numero_documento,
    fecha_vencimiento: payload.fecha_vencimiento,
    observaciones: payload.observaciones,
  })

  const handleGuardarModal = async (payload) => {
    try {
      if (lineaEdicion) {
        const body = buildUpdateBody(payload)
        if (esCredito) await actualizarVentaGuiaCreditoTurno(lineaEdicion.id, body)
        else await actualizarVentaGuiaRemisionTurno(lineaEdicion.id, body)
        onMensaje(`${titulo}: registro actualizado`)
      } else {
        if (esCredito) await agregarVentaGuiaCreditoTurno(turno.id, payload)
        else await agregarVentaGuiaRemisionTurno(turno.id, payload)
        onMensaje(`${titulo}: registro agregado`)
      }
      setShowModal(false)
      setLineaEdicion(null)
      onReload()
    } catch (error) {
      console.error(error)
      onMensaje(
        mensajeErrorApi(
          error,
          lineaEdicion ? 'Error al actualizar la línea' : 'Error al registrar la línea'
        ),
        'error'
      )
    }
  }

  const handleConfirmarEliminar = async () => {
    if (!lineaEliminar?.id) return
    try {
      if (esCredito) await eliminarVentaGuiaCreditoTurno(lineaEliminar.id)
      else await eliminarVentaGuiaRemisionTurno(lineaEliminar.id)
      onMensaje('Registro eliminado')
      setLineaEliminar(null)
      onReload()
    } catch (error) {
      console.error(error)
      onMensaje('Error al eliminar', 'error')
    }
  }

  const abrirNuevaLinea = () => {
    setLineaEdicion(null)
    setShowModal(true)
  }

  const handleMarcarPagado = async (linea) => {
    try {
      if (esCredito) await marcarGuiaCreditoPagadoTurno(linea.id)
      else await marcarGuiaRemisionPagadoTurno(linea.id)
      onMensaje('Marcado como pagado')
      onReload()
    } catch (error) {
      console.error(error)
      onMensaje('Error al actualizar', 'error')
    }
  }

  const pagadoFlag = (linea) => Boolean(linea.pagado)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Ventas registradas con {esCredito ? 'guía de crédito' : 'guía de remisión'} en este turno.
          </p>
        </div>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={abrirNuevaLinea} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </button>
        )}
      </div>

      {lineas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No hay registros en esta categoría.</p>
      ) : (
        <div className="space-y-3">
          {lineas.map((linea) => (
            <div key={linea.id} className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium">{nombreCliente(linea.cliente_id)}</p>
                  <p className="text-sm text-gray-700 mt-1">S/ {parseFloat(linea.monto || 0).toFixed(2)}</p>
                  {linea.numero_documento ? (
                    <p className="text-xs text-gray-500">Doc. {linea.numero_documento}</p>
                  ) : null}
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                      pagadoFlag(linea) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pagadoFlag(linea) ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
                {turnoGriferoEsAbierto(turno) && (
                  <div className="flex flex-wrap gap-2 justify-end shrink-0">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                      title="Editar"
                      onClick={() => {
                        setLineaEdicion(linea)
                        setShowModal(true)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm inline-flex items-center gap-1"
                      title="Eliminar"
                      onClick={() => setLineaEliminar(linea)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!pagadoFlag(linea) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm shrink-0"
                        onClick={() => handleMarcarPagado(linea)}
                      >
                        Marcar pagado
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalLineaGuiaTurno
          key={lineaEdicion?.id ?? 'nueva'}
          title={lineaEdicion ? `Editar — ${titulo}` : tituloModal}
          lineaInicial={lineaEdicion}
          numerosDocumentoOcupados={numerosDocumentoOcupados}
          onClose={() => {
            setShowModal(false)
            setLineaEdicion(null)
          }}
          onSubmit={handleGuardarModal}
        />
      )}

      {lineaEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar línea</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Eliminar el registro por <strong>S/ {parseFloat(lineaEliminar.monto || 0).toFixed(2)}</strong>
              {lineaEliminar.numero_documento ? <> (doc. {lineaEliminar.numero_documento})</> : null}? Se
              actualizarán los totales del turno.
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
