import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Fuel,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react'
import { consultarCreditoPorPlaca } from '../utils/api'

function FlagRow({ on, label, detail }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${
        on ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
      }`}
    >
      {on ? (
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className={`text-sm font-semibold ${on ? 'text-amber-950' : 'text-gray-700'}`}>{label}</p>
        {detail && <p className="text-xs text-gray-600 mt-0.5">{detail}</p>}
        <p className={`text-xs font-bold mt-1 ${on ? 'text-amber-800' : 'text-gray-500'}`}>
          {on ? 'SÍ — aplicar' : 'No aplica'}
        </p>
      </div>
    </div>
  )
}

export default function OperacionesCreditosConsultaPage() {
  const [placa, setPlaca] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const buscar = async (e) => {
    e?.preventDefault()
    const q = placa.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await consultarCreditoPorPlaca(q)
      setData(res)
    } catch (err) {
      const d = err?.response?.data?.detail
      const msg =
        (d && typeof d === 'object' && d.mensaje) ||
        (typeof d === 'string' ? d : null) ||
        'No se pudo consultar la placa'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 pb-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/25">
              <CreditCard className="w-6 h-6" />
            </span>
            Operaciones — Créditos
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Ingrese la placa del vehículo para ver la empresa, las reglas de despacho y los combustibles
            autorizados.
          </p>
        </header>

        <form
          onSubmit={buscar}
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3"
        >
          <label className="flex-1 block">
            <span className="block text-xs font-semibold text-gray-600 mb-1">Placa</span>
            <input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="Ej. ABC123"
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg font-semibold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              autoFocus
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3"
              disabled={loading || !placa.trim()}
            >
              <Search className="w-4 h-4" />
              {loading ? 'Buscando…' : 'Consultar'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="mt-6 space-y-4">
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa / cliente</p>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{data.cliente_nombre}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Doc. {data.cliente_documento || '—'} · Placa <span className="font-semibold">{data.placa}</span>
                {data.placa_descripcion ? ` · ${data.placa_descripcion}` : ''}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Modalidad crédito: <span className="font-medium">{data.modalidad}</span>
                {' · '}
                Estado perfil:{' '}
                <span
                  className={`font-semibold ${
                    data.perfil_estado === 'activo' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {data.perfil_estado}
                </span>
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">Indicaciones para el despacho</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FlagRow
                  on={!!data.solicitar_orden_compra}
                  label="Orden de compra"
                  detail="Adjuntar OC y firma del encargado autorizado"
                />
                <FlagRow
                  on={!!data.exige_persona_autorizada}
                  label="Persona autorizada"
                  detail="Debe estar presente alguien del catálogo"
                />
                <FlagRow
                  on={!!data.solicitar_firma_chofer}
                  label="Firma del chofer"
                  detail="Solo aplica con orden de compra"
                />
                <FlagRow
                  on={!!data.registrar_km_vehiculo}
                  label="Registrar km del vehículo"
                  detail="Capturar kilometraje en la guía"
                />
                <FlagRow
                  on={!!(data.permite_galonera_cliente && data.placa_permite_galonera)}
                  label="Galonera"
                  detail={
                    data.permite_galonera_cliente && !data.placa_permite_galonera
                      ? 'Cliente sí, esta placa no'
                      : 'Autorización operativa'
                  }
                />
              </div>
            </section>

            {Array.isArray(data.indicaciones) && data.indicaciones.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Resumen</h3>
                <ul className="space-y-1.5">
                  {data.indicaciones.map((t, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-emerald-700 font-bold">·</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-semibold text-gray-800">Combustibles permitidos</h3>
              </div>
              {(data.productos || []).length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500 text-center">Sin combustibles configurados</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.productos.map((p) => (
                    <li key={p.producto_id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {p.codigo ? `${p.codigo} · ` : ''}
                          {p.nombre || `Producto #${p.producto_id}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Modalidad: {(p.modalidades || []).join(', ') || '—'}
                          {!p.autorizado_cliente && (
                            <span className="text-red-600 font-medium"> · No autorizado al cliente</span>
                          )}
                        </p>
                      </div>
                      {p.autorizado_cliente ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(data.exige_persona_autorizada || data.solicitar_orden_compra) && (
              <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-semibold text-gray-800">Personas autorizadas (referencia)</h3>
                </div>
                {(data.personas || []).length === 0 ? (
                  <p className="px-4 py-6 text-sm text-amber-800 text-center bg-amber-50">
                    No hay personas activas registradas. Configure en Créditos → Personas autorizadas.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.personas.map((pe) => (
                      <li key={pe.id} className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{pe.nombres}</p>
                        <p className="text-xs text-gray-500">
                          {[pe.tipo_documento, pe.numero_documento].filter(Boolean).join(' ') || 'Sin documento'}
                          {pe.cargo ? ` · ${pe.cargo}` : ''}
                          {' · Firma: '}
                          {pe.tiene_firma ? 'registrada' : 'NO registrada'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
