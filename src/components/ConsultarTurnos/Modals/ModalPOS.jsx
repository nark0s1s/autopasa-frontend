import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function ModalPOS({ onClose, onSubmit, ventaInicial = null }) {
  const [formData, setFormData] = useState({
    monto: '',
    numero_operacion: '',
    tipo_tarjeta: 'credito',
    numero_lote: '',
    terminal_id: '',
    autorizacion: '',
  })

  useEffect(() => {
    if (ventaInicial) {
      setFormData({
        monto: ventaInicial.monto != null ? String(ventaInicial.monto) : '',
        numero_operacion: ventaInicial.numero_operacion ?? '',
        tipo_tarjeta: ventaInicial.tipo_tarjeta ?? 'credito',
        numero_lote: ventaInicial.numero_lote ?? '',
        terminal_id: ventaInicial.terminal_id ?? '',
        autorizacion: ventaInicial.autorizacion ?? '',
      })
    } else {
      setFormData({
        monto: '',
        numero_operacion: '',
        tipo_tarjeta: 'credito',
        numero_lote: '',
        terminal_id: '',
        autorizacion: '',
      })
    }
  }, [ventaInicial])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const titulo = ventaInicial ? 'Editar venta POS' : 'Nueva venta POS'

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
          <div>
            <label className="block text-sm font-medium mb-2">Monto</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Número de operación (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.numero_operacion}
              onChange={e => setFormData({...formData, numero_operacion: e.target.value})}
              placeholder="Si no aplica, se guarda como S/N"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de tarjeta</label>
            <select
              className="input"
              value={formData.tipo_tarjeta}
              onChange={e => setFormData({...formData, tipo_tarjeta: e.target.value})}
            >
              <option value="credito">Crédito</option>
              <option value="debito">Débito</option>
              <option value="prepagada">Prepagada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Número de lote (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.numero_lote}
              onChange={e => setFormData({...formData, numero_lote: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Terminal ID (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.terminal_id}
              onChange={e => setFormData({...formData, terminal_id: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Autorización (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.autorizacion}
              onChange={e => setFormData({...formData, autorizacion: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {ventaInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
