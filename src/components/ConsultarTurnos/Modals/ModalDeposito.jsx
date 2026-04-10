import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function ModalDeposito({ onClose, onSubmit, depositoInicial = null }) {
  const [formData, setFormData] = useState({
    monto: '',
    observaciones: '',
    numero_comprobante: '',
    recibido_por: ''
  })

  useEffect(() => {
    if (depositoInicial) {
      setFormData({
        monto: depositoInicial.monto != null ? String(depositoInicial.monto) : '',
        observaciones: depositoInicial.observaciones ?? '',
        numero_comprobante: depositoInicial.numero_comprobante ?? '',
        recibido_por: depositoInicial.recibido_por ?? '',
      })
    } else {
      setFormData({
        monto: '',
        observaciones: '',
        numero_comprobante: '',
        recibido_por: '',
      })
    }
  }, [depositoInicial])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const titulo = depositoInicial ? 'Editar depósito' : 'Nuevo depósito'

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
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea
              className="input min-h-[72px]"
              value={formData.observaciones}
              onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Número de comprobante (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.numero_comprobante}
              onChange={e => setFormData({...formData, numero_comprobante: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Recibido por (opcional)</label>
            <input
              type="text"
              className="input"
              value={formData.recibido_por}
              onChange={e => setFormData({...formData, recibido_por: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {depositoInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
