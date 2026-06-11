import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function ModalVale({ tiposVale = [], onClose, onSubmit, valeInicial = null }) {
  const firstTipoId = tiposVale[0]?.id != null ? String(tiposVale[0].id) : ''
  const [formData, setFormData] = useState({
    tipo_vale_id: firstTipoId,
    numero_vale: '',
    monto: '',
    observaciones: '',
    beneficiario: '',
    autorizado_por: ''
  })

  useEffect(() => {
    if (valeInicial) {
      setFormData({
        tipo_vale_id:
          valeInicial.tipo_vale_id != null ? String(valeInicial.tipo_vale_id) : firstTipoId,
        numero_vale: valeInicial.numero_vale ?? '',
        monto: valeInicial.monto != null ? String(valeInicial.monto) : '',
        observaciones: valeInicial.observaciones ?? '',
        beneficiario: valeInicial.beneficiario ?? '',
        autorizado_por: valeInicial.autorizado_por ?? '',
      })
    } else {
      setFormData({
        tipo_vale_id: firstTipoId,
        numero_vale: '',
        monto: '',
        observaciones: '',
        beneficiario: '',
        autorizado_por: '',
      })
    }
  }, [valeInicial, firstTipoId])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const titulo = valeInicial ? 'Editar vale' : 'Nuevo vale'

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
          {!tiposVale.length && (
            <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
              No hay tipos de vale en catálogo. Cargue tipos en mantenimiento o ejecute el seed de catálogos.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de vale</label>
            <select
              className="input"
              value={formData.tipo_vale_id}
              onChange={e => setFormData({...formData, tipo_vale_id: e.target.value})}
              required
              disabled={!tiposVale.length}
            >
              <option value="">Seleccione...</option>
              {tiposVale.map(t => (
                <option key={t.id} value={t.id}>{t.nombre || t.codigo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Número de Vale</label>
            <input
              type="text"
              className="input"
              value={formData.numero_vale}
              onChange={e => setFormData({...formData, numero_vale: e.target.value})}
              required
              autoFocus={!valeInicial}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Monto</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Beneficiario</label>
            <input
              type="text"
              className="input"
              value={formData.beneficiario}
              onChange={e => setFormData({...formData, beneficiario: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Autorizado por</label>
            <input
              type="text"
              className="input"
              value={formData.autorizado_por}
              onChange={e => setFormData({...formData, autorizado_por: e.target.value})}
              required
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
          
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {valeInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
