import { useMemo, useState } from 'react'
import { Fuel, Search, XCircle } from 'lucide-react'
import { consultarCreditoPorPlaca, consultarCreditoPorRuc } from '../utils/api'

function buildRequisitos(data, modo) {
  const items = []

  if (modo === 'ruc') {
    if (data.permite_guia_sin_placa) {
      items.push({
        id: 'sin_placa_ok',
        titulo: 'Permite atención sin placa',
        detalle: 'Puede despachar sin placa (equipos/maquinaria). Pedir y anotar el motivo.',
        tono: 'green',
      })
    } else {
      items.push({
        id: 'sin_placa_no',
        titulo: 'No permite atención sin placa',
        detalle: 'Este cliente exige placa autorizada. Use «Consultar crédito por placa».',
        tono: 'red',
      })
    }
  }

  if (data.solicitar_orden_pedido) {
    items.push({
      id: 'op',
      titulo: 'Orden de pedido',
      detalle: 'Pedir y registrar la orden de pedido del cliente.',
      tono: 'amber',
    })
  }
  if (data.solicitar_orden_compra) {
    items.push({
      id: 'oc',
      titulo: 'Orden de compra',
      detalle: 'Pedir y adjuntar la OC. Verificar firma del encargado autorizado.',
      tono: 'amber',
    })
  }
  if (data.exige_persona_autorizada) {
    items.push({
      id: 'persona',
      titulo: 'Persona autorizada',
      detalle: 'Debe estar presente alguien del listado de abajo.',
      tono: 'amber',
    })
  }
  if (data.solicitar_firma_chofer) {
    items.push({
      id: 'chofer',
      titulo: 'Firma del chofer',
      detalle: 'Capturar la firma del chofer en la guía.',
      tono: 'amber',
    })
  }
  if (data.registrar_km_vehiculo) {
    items.push({
      id: 'km',
      titulo: 'Registrar km del vehículo',
      detalle: 'Anotar el kilometraje en la guía.',
      tono: 'amber',
    })
  }

  const galoneraOk =
    modo === 'placa'
      ? !!(data.permite_galonera_cliente && data.placa_permite_galonera)
      : !!data.permite_galonera_cliente
  if (!galoneraOk) {
    items.push({
      id: 'no_galonera',
      titulo: 'No permite galoneras',
      detalle:
        modo === 'placa' && data.permite_galonera_cliente && !data.placa_permite_galonera
          ? 'El cliente permite galonera, pero esta placa no. No cargar en galonera.'
          : 'No cargar combustible en galonera.',
      tono: 'red',
    })
  }

  return items
}

const TONO_CLS = {
  amber: {
    box: 'bg-amber-400 border-amber-500',
    title: 'text-amber-950',
    detail: 'text-amber-950/80',
  },
  red: {
    box: 'bg-red-600 border-red-700',
    title: 'text-white',
    detail: 'text-white/90',
  },
  green: {
    box: 'bg-emerald-600 border-emerald-700',
    title: 'text-white',
    detail: 'text-white/90',
  },
}

/**
 * @param {{ modo?: 'placa' | 'ruc' }} props
 */
export default function OperacionesCreditosConsultaPage({ modo = 'placa' }) {
  const esPlaca = modo === 'placa'
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const requisitos = useMemo(() => (data ? buildRequisitos(data, modo) : []), [data, modo])
  const combustibles = useMemo(
    () => (data?.productos || []).filter((p) => p.autorizado_cliente),
    [data],
  )
  const bloqueado = data && data.perfil_estado !== 'activo'
  const motivoBloqueo = (data?.estado_motivo || '').trim()
  const galoneraOk =
    data &&
    (esPlaca
      ? !!(data.permite_galonera_cliente && data.placa_permite_galonera)
      : !!data.permite_galonera_cliente)

  const buscar = async (e) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      setData(esPlaca ? await consultarCreditoPorPlaca(q) : await consultarCreditoPorRuc(q))
    } catch (err) {
      const d = err?.response?.data?.detail
      setError(
        (d && typeof d === 'object' && d.mensaje) ||
          (typeof d === 'string' ? d : null) ||
          (esPlaca ? 'Placa no encontrada' : 'RUC no encontrado'),
      )
    } finally {
      setLoading(false)
    }
  }

  const mostrarPersonas =
    data && (data.exige_persona_autorizada || data.solicitar_orden_compra)

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6 sm:pt-10">
        <form onSubmit={buscar} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <label className="block">
            <span className="block text-base font-semibold text-gray-700 mb-2">
              {esPlaca ? 'Placa' : 'RUC / documento'}
            </span>
            <div className="flex gap-3">
              <input
                value={query}
                onChange={(e) =>
                  setQuery(esPlaca ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))
                }
                placeholder={esPlaca ? 'ABC123' : '20123456789'}
                inputMode={esPlaca ? 'text' : 'numeric'}
                className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-4 text-2xl sm:text-3xl font-bold tracking-[0.12em] uppercase text-center focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
                autoFocus
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-5 sm:px-6 font-semibold text-lg inline-flex items-center gap-2"
              >
                <Search className="w-6 h-6" />
                <span className="hidden sm:inline">{loading ? '…' : 'Ver'}</span>
              </button>
            </div>
          </label>
          {!esPlaca && (
            <p className="mt-3 text-sm text-gray-500 text-center">
              Para clientes que se atienden sin placa (equipos / maquinaria).
            </p>
          )}
        </form>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-600 text-white px-5 py-4 text-lg font-semibold flex items-center gap-3">
            <XCircle className="w-7 h-7 shrink-0" />
            {error}
          </div>
        )}

        {data && (
          <div className="mt-5 space-y-5">
            {bloqueado && (
              <div className="rounded-2xl bg-red-600 border-2 border-red-800 text-white px-5 py-6 text-center shadow-sm">
                <p className="text-2xl sm:text-3xl font-black uppercase tracking-wide">
                  No despachar — {data.perfil_estado}
                </p>
                <p className="mt-3 text-xl font-semibold leading-snug">
                  {motivoBloqueo || 'Sin motivo registrado. Consultar con oficina.'}
                </p>
                <p className="mt-2 text-base text-white/85">
                  El crédito de este cliente está {data.perfil_estado}. No emitir guía a crédito ni anticipo.
                </p>
              </div>
            )}

            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Empresa</p>
              <h2 className="mt-2 text-2xl sm:text-4xl font-black text-gray-900 leading-tight">
                {data.cliente_nombre}
              </h2>
              {esPlaca ? (
                <p className="mt-3 text-xl font-bold text-emerald-800 tracking-wider">{data.placa}</p>
              ) : (
                <p className="mt-3 text-xl font-bold text-emerald-800 tracking-wider">
                  RUC {data.cliente_documento || query}
                </p>
              )}
              {esPlaca && data.cliente_documento && (
                <p className="mt-1 text-base text-gray-500">RUC/Doc. {data.cliente_documento}</p>
              )}
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3 px-1">
                Requerido en este despacho
              </h3>
              {requisitos.length === 0 ? (
                <div className="rounded-2xl bg-emerald-700 text-white px-5 py-6 text-center">
                  <p className="text-2xl font-bold">Sin requisitos especiales</p>
                  <p className="text-base mt-1 opacity-90">Despacho estándar</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {requisitos.map((r, idx) => {
                    const t = TONO_CLS[r.tono] || TONO_CLS.amber
                    return (
                      <li
                        key={r.id}
                        className={`rounded-2xl border-2 px-5 py-5 shadow-sm ${t.box}`}
                      >
                        <p className={`text-2xl sm:text-3xl font-black leading-tight ${t.title}`}>
                          {idx + 1}. {r.titulo}
                        </p>
                        <p className={`mt-2 text-lg font-medium ${t.detail}`}>{r.detalle}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
              {galoneraOk && (
                <p className="mt-3 text-center text-lg font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  Galonera permitida{esPlaca ? ' en esta placa' : ' (cliente)'}
                </p>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-emerald-800 text-white flex items-center gap-3">
                <Fuel className="w-6 h-6" />
                <h3 className="text-xl font-bold">Combustible permitido</h3>
              </div>
              {combustibles.length === 0 ? (
                <p className="px-5 py-8 text-center text-lg text-gray-500">Ninguno configurado</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {combustibles.map((p) => (
                    <li key={p.producto_id} className="px-5 py-5">
                      <p className="text-2xl font-bold text-gray-900">
                        {p.nombre || `Producto #${p.producto_id}`}
                      </p>
                      {p.codigo && (
                        <p className="text-base text-gray-500 mt-0.5">{p.codigo}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {mostrarPersonas && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 bg-slate-800 text-white">
                  <h3 className="text-xl font-bold">Personas autorizadas</h3>
                </div>
                {(data.personas || []).length === 0 ? (
                  <p className="px-5 py-8 text-center text-lg font-semibold text-red-700">
                    No hay personas registradas — avisar a oficina
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {data.personas.map((pe) => (
                      <li key={pe.id} className="px-5 py-5">
                        <p className="text-2xl font-bold text-gray-900">{pe.nombres}</p>
                        <p className="text-base text-gray-600 mt-1">
                          {[pe.tipo_documento, pe.numero_documento].filter(Boolean).join(' ') ||
                            'Sin documento'}
                          {pe.tiene_firma ? '' : ' · Sin firma en sistema'}
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
