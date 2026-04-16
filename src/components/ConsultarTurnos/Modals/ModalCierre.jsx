import { useState } from 'react'
import { X } from 'lucide-react'
import { cerrarTurnoGrifero } from '../../../utils/api'

export function ModalCierre({ turno, totales, onClose, onSuccess }) {
  const [efectivoEntregado, setEfectivoEntregado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)

  const diferencia = efectivoEntregado ? 
    parseFloat(efectivoEntregado) - totales.efectivoEsperado : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const cerrado = await cerrarTurnoGrifero(turno.id, {
        efectivo_entregado: parseFloat(efectivoEntregado),
        observaciones
      })
      onSuccess(cerrado)
    } catch (error) {
      console.error('Error al cerrar turno:', error)
      alert('Error al cerrar turno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Cerrar Turno</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Resumen */}
        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Venta Combustible:</span>
            <span className="font-semibold">S/ {totales.totalCombustible.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Venta Productos:</span>
            <span className="font-semibold">S/ {totales.totalProductos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Ventas POS:</span>
            <span className="font-semibold">S/ {totales.totalPOS.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Ventas a crédito:</span>
            <span className="font-semibold">S/ {totales.totalCredito.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Descuentos aplicados:</span>
            <span className="font-semibold">S/ {totales.totalDescuentos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Vales:</span>
            <span className="font-semibold">S/ {totales.totalVales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Gastos autorizados:</span>
            <span className="font-semibold">S/ {totales.totalGastos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Depósitos en caja:</span>
            <span className="font-semibold">S/ {totales.totalDepositos.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-bold text-primary-600">
            <span>Efectivo Esperado:</span>
            <span>S/ {totales.efectivoEsperado.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Efectivo Entregado</label>
            <input
              type="number"
              step="0.01"
              className="input text-lg font-semibold"
              value={efectivoEntregado}
              onChange={e => setEfectivoEntregado(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          
          {efectivoEntregado && (
            <div className={`p-4 rounded-lg ${
              diferencia === 0 ? 'bg-green-50 text-green-900' :
              diferencia < 0 ? 'bg-red-50 text-red-900' :
              'bg-yellow-50 text-yellow-900'
            }`}>
              <p className="text-sm mb-1">Diferencia</p>
              <p className="text-3xl font-bold">
                {diferencia >= 0 ? '+' : ''}S/ {diferencia.toFixed(2)}
              </p>
              <p className="text-sm mt-2">
                {diferencia === 0 ? '✅ Cuadrado' :
                 diferencia < 0 ? '❌ Faltante' :
                 '⚠️ Sobrante'}
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              className="input"
              rows="3"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              disabled={loading}
              placeholder="Opcional"
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-success flex-1"
              disabled={loading}
            >
              {loading ? 'Cerrando...' : 'Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
