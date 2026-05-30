import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getClientes, getBancos } from '../../../utils/api'

export function ModalTransferenciaBancaria({ onClose, onSubmit, transferenciaInicial = null }) {
  const [clientes, setClientes] = useState([])
  const [bancos, setBancos] = useState([])
  const [formData, setFormData] = useState({
    cliente_id: '',
    banco_id: '',
    banco_otro_nombre: '',
    monto: '',
    observaciones: '',
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([getClientes(true), getBancos(true)])
      .then(([cls, bks]) => {
        if (cancelled) return
        setClientes(Array.isArray(cls) ? cls : [])
        setBancos(Array.isArray(bks) ? bks : [])
      })
      .catch(() => {
        if (!cancelled) {
          setClientes([])
          setBancos([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (transferenciaInicial) {
      setFormData({
        cliente_id: transferenciaInicial.cliente_id != null ? String(transferenciaInicial.cliente_id) : '',
        banco_id: transferenciaInicial.banco_id != null ? String(transferenciaInicial.banco_id) : '',
        banco_otro_nombre: transferenciaInicial.banco_otro_nombre ?? '',
        monto: transferenciaInicial.monto != null ? String(transferenciaInicial.monto) : '',
        observaciones: transferenciaInicial.observaciones ?? '',
      })
    } else {
      setFormData({
        cliente_id: '',
        banco_id: '',
        banco_otro_nombre: '',
        monto: '',
        observaciones: '',
      })
    }
  }, [transferenciaInicial])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      cliente_id: formData.cliente_id ? Number(formData.cliente_id) : null,
      banco_id: formData.banco_id ? Number(formData.banco_id) : null,
      banco_otro_nombre: formData.banco_otro_nombre?.trim() || null,
      monto: parseFloat(formData.monto),
      observaciones: formData.observaciones?.trim() || null,
    })
  }

  const titulo = transferenciaInicial ? 'Editar transferencia bancaria' : 'Nueva transferencia bancaria'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cliente (opcional)</label>
            <select
              className="input"
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
            >
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.razon_social}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Banco (opcional)</label>
            <select
              className="input"
              value={formData.banco_id}
              onChange={(e) => setFormData({ ...formData, banco_id: e.target.value })}
            >
              <option value="">— Seleccione o escriba abajo —</option>
              {bancos.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Otro banco (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Si no está en el catálogo"
              value={formData.banco_otro_nombre}
              onChange={(e) => setFormData({ ...formData, banco_otro_nombre: e.target.value })}
              disabled={Boolean(formData.banco_id)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Importe *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones (opcional)</label>
            <textarea
              className="input min-h-[72px]"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {transferenciaInicial ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
