import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link2, Plus, X } from 'lucide-react'
import {
  listarVinculosTurnoConfigIsla,
  listarTurnosConfigInfra,
  listarIslasInfra,
  vincularIslaTurnoConfig,
  desvincularIslaTurnoConfig,
} from '../../utils/api'

export default function TurnoConfigIslaPage() {
  const [vinculos, setVinculos] = useState([])
  const [configs, setConfigs] = useState([])
  const [islas, setIslas] = useState([])
  const [filtroConfigId, setFiltroConfigId] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [selConfig, setSelConfig] = useState('')
  const [selIsla, setSelIsla] = useState('')
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroConfigId) params.turno_config_id = Number(filtroConfigId)
      const [v, cf, isl] = await Promise.all([
        listarVinculosTurnoConfigIsla(params),
        listarTurnosConfigInfra(),
        listarIslasInfra(),
      ])
      setVinculos(Array.isArray(v) ? v : [])
      setConfigs(Array.isArray(cf) ? cf : [])
      setIslas(Array.isArray(isl) ? isl : [])
    } catch {
      setVinculos([])
      setConfigs([])
      setIslas([])
    } finally {
      setLoading(false)
    }
  }, [filtroConfigId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const paresExistentes = useMemo(() => {
    const s = new Set()
    vinculos.forEach((r) => s.add(`${r.turno_config_id}-${r.isla_id}`))
    return s
  }, [vinculos])

  const islasDisponiblesPara = (configId) => {
    if (!configId) return islas
    const cid = Number(configId)
    return islas.filter((i) => !paresExistentes.has(`${cid}-${i.id}`))
  }

  const agregarVinculo = async (e) => {
    e.preventDefault()
    setErr('')
    if (!selConfig || !selIsla) {
      setErr('Seleccione configuración e isla')
      return
    }
    setGuardando(true)
    try {
      await vincularIslaTurnoConfig(Number(selConfig), Number(selIsla))
      setModal(false)
      setSelConfig('')
      setSelIsla('')
      cargar()
    } catch (er) {
      const d = er.response?.data?.detail
      setErr(typeof d === 'string' ? d : 'No se pudo vincular')
    } finally {
      setGuardando(false)
    }
  }

  const quitar = async (configId, islaId) => {
    if (!window.confirm('¿Quitar esta isla de la configuración de turno?')) return
    try {
      await desvincularIslaTurnoConfig(configId, islaId)
      cargar()
    } catch {
      alert('No se pudo eliminar el vínculo')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Turno config ↔ Islas</h1>
              <p className="text-sm text-gray-600">
                Mantenimiento de la tabla <code className="text-xs bg-gray-100 px-1 rounded">turno_config_isla</code>
                : qué islas intervienen en cada plantilla de turno de liquidación.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2 self-start"
            onClick={() => {
              setErr('')
              setSelConfig(filtroConfigId || '')
              setSelIsla('')
              setModal(true)
            }}
          >
            <Plus className="w-5 h-5" />
            Nuevo vínculo
          </button>
        </div>

        <div className="card p-4 mb-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por configuración</label>
            <select
              className="input min-w-[220px]"
              value={filtroConfigId}
              onChange={(e) => setFiltroConfigId(e.target.value)}
            >
              <option value="">Todas</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Cargando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Config turno</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Isla</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vinculos.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{r.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{r.turno_config_codigo}</span>
                        <span className="text-gray-600"> — {r.turno_config_nombre}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{r.isla_codigo}</span>
                        <span className="text-gray-600"> — {r.isla_nombre}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-red-600 hover:underline text-sm"
                          onClick={() => quitar(r.turno_config_id, r.isla_id)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vinculos.length === 0 && (
                <p className="p-6 text-gray-500">No hay vínculos. Use &quot;Nuevo vínculo&quot; o edite desde Turnos (configuración).</p>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-gray-900">Nuevo vínculo config ↔ isla</h2>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={agregarVinculo} className="p-4 space-y-3">
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div>
                <label className="text-xs font-medium text-gray-600">Configuración de turno *</label>
                <select
                  className="input w-full mt-1"
                  value={selConfig}
                  onChange={(e) => {
                    setSelConfig(e.target.value)
                    setSelIsla('')
                  }}
                  required
                >
                  <option value="">Seleccione…</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Isla (sin vincular aún) *</label>
                <select
                  className="input w-full mt-1"
                  value={selIsla}
                  onChange={(e) => setSelIsla(e.target.value)}
                  required
                >
                  <option value="">Seleccione…</option>
                  {islasDisponiblesPara(selConfig).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.codigo} — {i.nombre}
                    </option>
                  ))}
                </select>
                {selConfig && islasDisponiblesPara(selConfig).length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">Todas las islas ya están vinculadas a esta config.</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
