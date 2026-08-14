import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Edit2, Plus, Trash2, X } from 'lucide-react'
import {
  actualizarPermisoPersonal,
  crearPermisoPersonal,
  desactivarPermisoPersonal,
  getEmpleados,
  listarPermisosPersonal,
  listarTurnosConfigInfra,
} from '../../utils/api'

const MOTIVOS = [
  { value: 'personal', label: 'Personal' },
  { value: 'salud', label: 'Salud' },
  { value: 'cumpleanos', label: 'Cumpleaños' },
]

function labelMotivo(v) {
  return MOTIVOS.find((m) => m.value === v)?.label || v
}

function toYMD(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d)
  const o = x.getTimezoneOffset() * 60000
  return new Date(x.getTime() - o).toISOString().split('T')[0]
}

function ModalPermiso({ item, empleados, turnos, onClose, onSave }) {
  const esEdicion = !!item
  const [form, setForm] = useState({
    empleado_id: item?.empleado_id != null ? String(item.empleado_id) : '',
    fecha: item?.fecha ? String(item.fecha).slice(0, 10) : toYMD(),
    turno_config_id: item?.turno_config_id != null ? String(item.turno_config_id) : '',
    motivo: item?.motivo || 'personal',
    observacion: item?.observacion || '',
    activo: item?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.empleado_id || !form.turno_config_id || !form.fecha) {
      setError('Complete personal, fecha y turno')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        empleado_id: Number(form.empleado_id),
        fecha: form.fecha,
        turno_config_id: Number(form.turno_config_id),
        motivo: form.motivo,
        observacion: form.observacion.trim() || null,
        activo: !!form.activo,
      }
      if (esEdicion) await actualizarPermisoPersonal(item.id, payload)
      else await crearPermisoPersonal(payload)
      onSave()
    } catch (err) {
      const d = err?.response?.data?.detail
      setError(typeof d === 'string' ? d : d?.mensaje || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {esEdicion ? 'Editar permiso' : 'Nuevo permiso del personal'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Personal *</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.empleado_id}
              onChange={(e) => setF('empleado_id', e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombres} {e.apellidos}
                  {e.codigo ? ` (${e.codigo})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.fecha}
              onChange={(e) => setF('fecha', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Turno *</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.turno_config_id}
              onChange={(e) => setF('turno_config_id', e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.codigo ? `${t.codigo} — ` : ''}
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo *</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.motivo}
              onChange={(e) => setF('motivo', e.target.value)}
              required
            >
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observación</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={form.observacion}
              onChange={(e) => setF('observacion', e.target.value)}
              maxLength={300}
            />
          </div>
          {esEdicion && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo} onChange={(e) => setF('activo', e.target.checked)} />
              Activo
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PermisosPersonalPage() {
  const [lista, setLista] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editar, setEditar] = useState(null)
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const params = { activo: true }
      if (filtroDesde) params.fecha_desde = filtroDesde
      if (filtroHasta) params.fecha_hasta = filtroHasta
      const data = await listarPermisosPersonal(params)
      setLista(Array.isArray(data) ? data : [])
    } catch {
      setError('No se pudieron cargar los permisos')
      setLista([])
    } finally {
      setCargando(false)
    }
  }, [filtroDesde, filtroHasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    getEmpleados(true)
      .then((d) => setEmpleados(Array.isArray(d) ? d : []))
      .catch(() => setEmpleados([]))
    listarTurnosConfigInfra({ activo: true })
      .then((d) => setTurnos(Array.isArray(d) ? d : []))
      .catch(() => setTurnos([]))
  }, [])

  const abrirNuevo = () => {
    setEditar(null)
    setModal(true)
  }

  const abrirEditar = (row) => {
    setEditar(row)
    setModal(true)
  }

  const eliminar = async (row) => {
    if (!window.confirm(`¿Desactivar el permiso de ${row.empleado_nombre || 'personal'} del ${String(row.fecha).slice(0, 10)}?`)) {
      return
    }
    try {
      await desactivarPermisoPersonal(row.id)
      await cargar()
    } catch {
      alert('No se pudo desactivar')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <CalendarDays className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Permisos del personal</h1>
            <p className="text-sm text-gray-500">Registro simple de permisos del personal de grifo</p>
          </div>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nuevo permiso
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row gap-3 items-end">
        <label className="block flex-1">
          <span className="text-xs font-semibold text-gray-600">Desde</span>
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        </label>
        <label className="block flex-1">
          <span className="text-xs font-semibold text-gray-600">Hasta</span>
          <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
        </label>
        <button type="button" onClick={cargar} className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          Filtrar
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Personal</th>
              <th className="px-3 py-2 text-left">Turno</th>
              <th className="px-3 py-2 text-left">Motivo</th>
              <th className="px-3 py-2 text-left">Observación</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!cargando && lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  Sin permisos registrados
                </td>
              </tr>
            )}
            {!cargando &&
              lista.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{String(r.fecha).slice(0, 10)}</td>
                  <td className="px-3 py-2 font-medium">{r.empleado_nombre || `#${r.empleado_id}`}</td>
                  <td className="px-3 py-2">{r.turno_nombre || `#${r.turno_config_id}`}</td>
                  <td className="px-3 py-2">{labelMotivo(r.motivo)}</td>
                  <td className="px-3 py-2 text-gray-600">{r.observacion || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Editar" onClick={() => abrirEditar(r)}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Desactivar" onClick={() => eliminar(r)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalPermiso
          item={editar}
          empleados={empleados}
          turnos={turnos}
          onClose={() => setModal(false)}
          onSave={async () => {
            setModal(false)
            await cargar()
          }}
        />
      )}
    </div>
  )
}
