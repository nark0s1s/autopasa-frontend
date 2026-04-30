import { useState, useEffect, useCallback } from 'react'
import { Landmark, Plus, Pencil, X } from 'lucide-react'
import {
  getTesoreriaCuentasCorrientes,
  crearTesoreriaCuentaCorriente,
  actualizarTesoreriaCuentaCorriente,
  getBancos,
} from '../utils/api'

function fmtMonto(n) {
  const v = Number(n || 0)
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ModalCuenta({ cuenta, bancos, onClose, onGuardado }) {
  const esEdicion = !!cuenta
  const [form, setForm] = useState({
    banco_id: cuenta?.banco_id ?? (bancos[0]?.id ?? ''),
    nombre: cuenta?.nombre ?? '',
    numero_cuenta: cuenta?.numero_cuenta ?? '',
    cci: cuenta?.cci ?? '',
    moneda: cuenta?.moneda ?? 'PEN',
    activo: cuenta?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'banco_id' ? (value === '' ? '' : parseInt(value, 10)) : value,
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const payload = {
        banco_id: Number(form.banco_id),
        nombre: form.nombre.trim(),
        numero_cuenta: form.numero_cuenta.trim(),
        cci: form.cci.trim() || null,
        moneda: (form.moneda || 'PEN').trim(),
        activo: !!form.activo,
      }
      if (esEdicion) await actualizarTesoreriaCuentaCorriente(cuenta.id, payload)
      else await crearTesoreriaCuentaCorriente(payload)
      onGuardado()
    } catch (err) {
      const d = err.response?.data?.detail
      setError(typeof d === 'string' ? d : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar cuenta corriente' : 'Nueva cuenta corriente'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banco *</label>
            <select
              name="banco_id"
              value={form.banco_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre visible *</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              maxLength={160}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej. Cuenta principal estación"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número de cuenta *</label>
            <input
              name="numero_cuenta"
              value={form.numero_cuenta}
              onChange={handleChange}
              required
              maxLength={34}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CCI</label>
            <input
              name="cci"
              value={form.cci}
              onChange={handleChange}
              maxLength={40}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <input
              name="moneda"
              value={form.moneda}
              onChange={handleChange}
              maxLength={5}
              className="w-full border rounded-lg px-3 py-2 text-sm w-24"
            />
          </div>
          {esEdicion && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} />
              Activa
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm text-gray-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TesoreriaCuentasCorrientesPage() {
  const [rows, setRows] = useState([])
  const [bancos, setBancos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [c, b] = await Promise.all([getTesoreriaCuentasCorrientes(null), getBancos(true)])
      setRows(Array.isArray(c) ? c : [])
      setBancos(Array.isArray(b) ? b : [])
    } catch (e) {
      const d = e.response?.data?.detail
      setError(typeof d === 'string' ? d : 'No se pudo cargar')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Landmark className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bancos — cuentas corrientes / ahorro</h1>
            <p className="text-sm text-gray-600">
              Cuentas de la empresa en el catálogo de bancos; el saldo se actualiza al cerrar consolidaciones (depósito
              de efectivo). Menú: <strong className="text-gray-800">Tesorería → Bancos (CC / ahorro)</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal({})}
          disabled={bancos.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Nueva cuenta
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Banco</th>
                <th className="p-3">Nº cuenta</th>
                <th className="p-3 text-right">Saldo S/</th>
                <th className="p-3">Estado</th>
                <th className="p-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay cuentas registradas.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="p-3 font-medium text-gray-900">{r.nombre}</td>
                    <td className="p-3 text-gray-700">{r.banco?.nombre ?? '—'}</td>
                    <td className="p-3 font-mono text-xs">{r.numero_cuenta}</td>
                    <td className="p-3 text-right tabular-nums">{fmtMonto(r.saldo_actual)}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {r.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => setModal(r)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && bancos.length > 0 && (
        <ModalCuenta
          cuenta={modal.id ? modal : null}
          bancos={bancos}
          onClose={() => setModal(null)}
          onGuardado={() => {
            setModal(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}
