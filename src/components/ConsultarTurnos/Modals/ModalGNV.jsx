import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * @param {'venta' | 'financiacion'} variant
 * @param {object | null} filaInicial — venta: venta_total_soles; financiacion: monto_soles
 */
export function ModalGNV({ variant, onClose, onSubmit, filaInicial = null }) {
  const [ventaTotal, setVentaTotal] = useState('')
  const [montoFin, setMontoFin] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (variant === 'venta') {
      if (filaInicial) {
        setVentaTotal(
          filaInicial.venta_total_soles != null ? String(filaInicial.venta_total_soles) : ''
        )
        setObservaciones(filaInicial.observaciones ?? '')
      } else {
        setVentaTotal('')
        setObservaciones('')
      }
    } else {
      if (filaInicial) {
        setMontoFin(filaInicial.monto_soles != null ? String(filaInicial.monto_soles) : '')
        setObservaciones(filaInicial.observaciones ?? '')
      } else {
        setMontoFin('')
        setObservaciones('')
      }
    }
  }, [filaInicial, variant])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (variant === 'venta') {
      onSubmit({ venta_total_soles: ventaTotal, observaciones: observaciones || null })
    } else {
      onSubmit({ monto_soles: montoFin, observaciones: observaciones || null })
    }
  }

  const titulo =
    variant === 'venta'
      ? filaInicial
        ? 'Editar venta GNV'
        : 'Nueva venta GNV'
      : filaInicial
        ? 'Editar financiación GNV'
        : 'Nueva financiación GNV'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {variant === 'venta' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Venta total (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={ventaTotal}
                onChange={(e) => setVentaTotal(e.target.value)}
                required
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Monto (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={montoFin}
                onChange={(e) => setMontoFin(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea
              className="input min-h-[80px]"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
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
