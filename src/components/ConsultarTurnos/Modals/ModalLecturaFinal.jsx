import { useState } from 'react'
import { X } from 'lucide-react'

export function ModalLecturaFinal({ lectura, onClose, onSubmit }) {
  const [lecturaFinal, setLecturaFinal] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = parseFloat(lecturaFinal)
    const ok = await onSubmit(v)
    if (ok) onClose()
  }

  const fin = parseFloat(lecturaFinal)
  const ini = parseFloat(lectura.lectura_inicial)
  const precio = parseFloat(lectura.precio_venta)
  const muestraResumen =
    lecturaFinal !== '' && !Number.isNaN(fin) && !Number.isNaN(ini) && !Number.isNaN(precio)
  const diferenciaGal = muestraResumen ? fin - ini : null
  const totalSoles =
    muestraResumen && diferenciaGal !== null ? diferenciaGal * precio : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Registrar Lectura Final</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

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
              autoFocus
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Lectura inicial (referencia)</p>
            <p className="text-xl font-bold">
              {(() => {
                const x = parseFloat(lectura.lectura_inicial)
                return `${Number.isNaN(x) ? lectura.lectura_inicial : x.toFixed(2)} gal`
              })()}
            </p>
          </div>

          {muestraResumen && diferenciaGal !== null && totalSoles !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-800">Resumen</p>
              <p className="text-sm text-slate-700">
                Diferencia (final − inicial): <strong>{diferenciaGal.toFixed(2)} gal</strong>
              </p>
              <p className="text-sm text-slate-700">
                × Precio combustible: <strong>S/ {precio.toFixed(2)}</strong>
              </p>
              <p className="text-base font-bold text-primary-800 pt-2 border-t border-slate-200">
                Total venta combustible: S/ {totalSoles.toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
