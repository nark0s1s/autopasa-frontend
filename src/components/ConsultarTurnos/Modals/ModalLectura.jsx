import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getPrefillLecturaContometro } from '../../../utils/api'

export function ModalLectura({ cabeceraGriferoId, contometros, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    contometro_id: '',
    lectura_inicial: '',
    lectura_final: '',
    precio_venta: '',
    tiene_anomalia: false,
    observaciones: ''
  })
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [productoNombre, setProductoNombre] = useState('')

  useEffect(() => {
    const cid = formData.contometro_id
    if (!cid || !cabeceraGriferoId) {
      setProductoNombre('')
      return undefined
    }
    let cancelled = false
    setPrefillLoading(true)
    getPrefillLecturaContometro(cabeceraGriferoId, cid)
      .then((data) => {
        if (cancelled) return
        const raw = data.lectura_inicial_desde_cuadre_anterior
        const s =
          raw !== undefined && raw !== null && raw !== '' ? String(raw) : '0'
        setFormData((prev) => ({
          ...prev,
          contometro_id: cid,
          lectura_inicial: s,
          lectura_final: s,
          precio_venta:
            data.precio_venta !== undefined && data.precio_venta !== null
              ? String(data.precio_venta)
              : '',
        }))
        setProductoNombre(data.producto_nombre || '')
      })
      .catch(() => {
        if (cancelled) return
        setFormData((prev) => ({
          ...prev,
          contometro_id: cid,
          lectura_inicial: '0',
          lectura_final: '0',
          precio_venta: '',
        }))
        setProductoNombre('')
      })
      .finally(() => {
        if (!cancelled) setPrefillLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [formData.contometro_id, cabeceraGriferoId])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const puedeGuardar =
    !prefillLoading &&
    formData.contometro_id &&
    formData.precio_venta !== '' &&
    formData.lectura_inicial !== '' &&
    formData.lectura_final !== ''

  const iniNum = parseFloat(formData.lectura_inicial)
  const finNum = parseFloat(formData.lectura_final)
  const precioNum = parseFloat(formData.precio_venta)
  const resumenValido =
    !Number.isNaN(iniNum) &&
    !Number.isNaN(finNum) &&
    !Number.isNaN(precioNum)
  const diferenciaGal = resumenValido ? finNum - iniNum : null
  const totalSoles =
    resumenValido && diferenciaGal !== null ? diferenciaGal * precioNum : null
  const diferenciaGalFmt =
    diferenciaGal !== null ? Number(diferenciaGal.toFixed(2)) : null
  const totalSolesFmt = totalSoles !== null ? Number(totalSoles.toFixed(2)) : null

  const lecturasEditables = Boolean(formData.contometro_id) && !prefillLoading

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nueva Lectura de Contómetro</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Contómetro</label>
            <select
              className="input"
              value={formData.contometro_id}
              onChange={e =>
                setFormData(prev => ({ ...prev, contometro_id: e.target.value }))
              }
              required
            >
              <option value="">Seleccione...</option>
              {contometros.map(c => (
                <option key={c.id} value={c.id}>{c.codigo}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Primero elija el contómetro. La lectura inicial sugerida es la{' '}
              <strong>lectura final del último turno cerrado</strong> para ese equipo; si no hay historial,{' '}
              <strong>0</strong>.
            </p>
          </div>

          {!formData.contometro_id && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Seleccione el tipo de contómetro para habilitar las lecturas inicial y final.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Lectura final (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input disabled:opacity-60"
              value={formData.lectura_final}
              onChange={e =>
                setFormData({
                  ...formData,
                  lectura_final: e.target.value,
                })
              }
              required
              disabled={!lecturasEditables}
              placeholder={lecturasEditables ? '' : 'Seleccione contómetro…'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Puede igualar la inicial y completar el final después con &quot;Registrar Final&quot;.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Lectura inicial (galones)</label>
            <input
              type="number"
              step="0.01"
              className="input disabled:opacity-60"
              value={formData.lectura_inicial}
              onChange={e =>
                setFormData({
                  ...formData,
                  lectura_inicial: e.target.value,
                })
              }
              required
              disabled={!lecturasEditables}
              placeholder={lecturasEditables ? '' : 'Seleccione contómetro…'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Precio de venta (solo lectura)</label>
            <input
              type="text"
              readOnly
              className="input bg-gray-50 text-gray-800 cursor-not-allowed"
              value={
                !formData.contometro_id
                  ? 'Seleccione contómetro…'
                  : formData.precio_venta !== ''
                    ? `S/ ${Number(formData.precio_venta).toFixed(2)}${productoNombre ? ` · ${productoNombre}` : ''}`
                    : prefillLoading
                      ? 'Cargando…'
                      : '—'
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Tomado del producto/combustible en mantenimiento; el servidor valida el mismo valor al guardar.
            </p>
          </div>

          {resumenValido && diferenciaGalFmt !== null && totalSolesFmt !== null && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-800">Resumen</p>
              <p className="text-sm text-slate-700">
                Diferencia (lectura final − inicial):{' '}
                <strong>{diferenciaGalFmt.toFixed(2)} gal</strong>
              </p>
              <p className="text-sm text-slate-700">
                × Precio combustible: <strong>S/ {precioNum.toFixed(2)}</strong>
              </p>
              <p className="text-base font-bold text-primary-800 pt-2 border-t border-slate-200">
                Total venta combustible: S/ {totalSolesFmt.toFixed(2)}
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.tiene_anomalia}
              onChange={e =>
                setFormData({ ...formData, tiene_anomalia: e.target.checked })
              }
            />
            Hay anomalía en el contómetro
          </label>

          <div>
            <label className="block text-sm font-medium mb-2">Observaciones</label>
            <textarea
              className="input min-h-[72px]"
              value={formData.observaciones}
              onChange={e =>
                setFormData({ ...formData, observaciones: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={!puedeGuardar}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
