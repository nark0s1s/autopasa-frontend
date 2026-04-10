import { useState } from 'react'
import { X } from 'lucide-react'

export function ModalLecturaEditar({ lectura, contometros, onClose, onSubmit }) {
  const contometro = contometros.find((c) => c.id === lectura.contometro_id)
  const [lecturaInicial, setLecturaInicial] = useState(String(lectura.lectura_inicial ?? ''))
  const [lecturaFinal, setLecturaFinal] = useState(String(lectura.lectura_final ?? ''))
  const [tieneAnomalia, setTieneAnomalia] = useState(Boolean(lectura.tiene_anomalia))
  const [observaciones, setObservaciones] = useState(lectura.observaciones ?? '')

  const precio = parseFloat(lectura.precio_venta)
  const iniNum = parseFloat(lecturaInicial)
  const finNum = parseFloat(lecturaFinal)
  const resumenValido =
    !Number.isNaN(iniNum) && !Number.isNaN(finNum) && !Number.isNaN(precio)
  const diferenciaGal = resumenValido ? finNum - iniNum : null
  const totalSoles =
    resumenValido && diferenciaGal !== null ? diferenciaGal * precio : null
  const guardarValido =
    resumenValido && finNum >= iniNum && lecturaInicial !== '' && lecturaFinal !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!guardarValido) return
    const ok = await onSubmit({
      lectura_inicial: iniNum,
      lectura_final: finNum,
      tiene_anomalia: tieneAnomalia,
      observaciones: observaciones.trim() ? observaciones.trim() : null,
    })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Editar lectura de contómetro</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          <span className="font-medium text-gray-900">
            {contometro?.codigo || `Contómetro #${lectura.contometro_id}`}
          </span>
          {' · '}
          Precio vigente al registrar: <strong>S/ {parseFloat(lectura.precio_venta).toFixed(2)}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Lectura final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={lecturaFinal}
              onChange={(e) => setLecturaFinal(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lectura inicial (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={lecturaInicial}
              onChange={(e) => setLecturaInicial(e.target.value)}
              required
            />
          </div>

          {resumenValido && diferenciaGal !== null && totalSoles !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-800">Resumen</p>
              <p className="text-sm text-slate-700">
                Diferencia (final − inicial): <strong>{diferenciaGal.toFixed(2)} gal</strong>
              </p>
              <p className="text-sm text-slate-700">
                × Precio: <strong>S/ {precio.toFixed(2)}</strong>
              </p>
              <p className="text-base font-bold text-primary-800 pt-2 border-t border-slate-200">
                Total venta combustible: S/ {totalSoles.toFixed(2)}
              </p>
              {finNum < iniNum && (
                <p className="text-sm text-red-600">La lectura final no puede ser menor que la inicial.</p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tieneAnomalia}
              onChange={(e) => setTieneAnomalia(e.target.checked)}
            />
            Hay anomalía en el contómetro
          </label>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              className="input min-h-[72px]"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!guardarValido}>
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
