import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { agregarLecturaContometro, actualizarLecturaContometro } from '../../../utils/api'
import { turnoGriferoEsAbierto } from '../../../utils/turnoGriferoEstado'
import { ModalLectura } from '../Modals/ModalLectura'
import { ModalLecturaEditar } from '../Modals/ModalLecturaEditar'
import { ModalLecturaFinal } from '../Modals/ModalLecturaFinal'

export function TabLecturas({ turno, contometros, onReload, onMensaje }) {
  const [showModal, setShowModal] = useState(false)
  const [lecturaEdit, setLecturaEdit] = useState(null)
  const [lecturaEditCompleta, setLecturaEditCompleta] = useState(null)

  const idsConLectura = new Set(
    (turno.lecturas_contometro || []).map((l) => l.contometro_id)
  )
  const contometrosParaNuevaLectura = contometros.filter((c) => !idsConLectura.has(c.id))

  const handleAgregar = async (data) => {
    try {
      await agregarLecturaContometro(turno.id, {
        contometro_id: Number(data.contometro_id),
        lectura_inicial: data.lectura_inicial,
        lectura_final: data.lectura_final,
        precio_venta: data.precio_venta,
        tiene_anomalia: Boolean(data.tiene_anomalia),
        observaciones: data.observaciones || null
      })
      onMensaje('Lectura agregada correctamente')
      setShowModal(false)
      onReload()
    } catch (error) {
      onMensaje('Error al agregar lectura', 'error')
    }
  }

  const handleActualizar = async (lecturaId, payload) => {
    try {
      await actualizarLecturaContometro(lecturaId, payload)
      onMensaje('Lectura actualizada correctamente')
      onReload()
      return true
    } catch (error) {
      onMensaje('Error al actualizar lectura', 'error')
      return false
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Lecturas de Contómetros</h3>
        {turnoGriferoEsAbierto(turno) && (
          <button type="button" onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Lectura
          </button>
        )}
      </div>

      <div className="space-y-3">
        {turno.lecturas_contometro?.map(lectura => {
          const contometro = contometros.find(c => c.id === lectura.contometro_id)
          const codigoContometro = contometro?.codigo || `#${lectura.contometro_id}`
          const gal = parseFloat(lectura.lectura_final) - parseFloat(lectura.lectura_inicial)
          const monto = gal * parseFloat(lectura.precio_venta)
          const pendienteFinal =
            Number(lectura.lectura_final) === Number(lectura.lectura_inicial)
          return (
            <div key={lectura.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{codigoContometro}</p>
                  <p className="text-sm text-gray-600">
                    Lectura Inicial: {lectura.lectura_inicial} gal
                  </p>
                  <p className="text-sm text-gray-600">
                    Lectura Final: {lectura.lectura_final} gal
                  </p>
                  <p className="text-sm font-semibold text-primary-600">
                    Total: {gal.toFixed(3)} gal × S/ {lectura.precio_venta} = S/ {monto.toFixed(2)}
                  </p>
                </div>
                {turnoGriferoEsAbierto(turno) && (
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      type="button"
                      onClick={() => setLecturaEditCompleta(lectura)}
                      className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar lectura
                    </button>
                    {pendienteFinal && (
                      <button
                        type="button"
                        onClick={() => setLecturaEdit(lectura)}
                        className="btn btn-primary btn-sm"
                      >
                        Registrar Final
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <ModalLectura
          cabeceraGriferoId={turno.id}
          contometros={contometrosParaNuevaLectura}
          onClose={() => setShowModal(false)}
          onSubmit={handleAgregar}
        />
      )}

      {lecturaEdit && (
        <ModalLecturaFinal
          lectura={lecturaEdit}
          onClose={() => setLecturaEdit(null)}
          onSubmit={async (lecturaFinal) => {
            const ok = await handleActualizar(lecturaEdit.id, { lectura_final: lecturaFinal })
            if (ok) setLecturaEdit(null)
            return ok
          }}
        />
      )}

      {lecturaEditCompleta && (
        <ModalLecturaEditar
          lectura={lecturaEditCompleta}
          contometros={contometros}
          onClose={() => setLecturaEditCompleta(null)}
          onSubmit={async (payload) => {
            const ok = await handleActualizar(lecturaEditCompleta.id, payload)
            if (ok) setLecturaEditCompleta(null)
            return ok
          }}
        />
      )}
    </div>
  )
}
