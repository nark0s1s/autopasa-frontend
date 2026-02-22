import { useState, useCallback } from 'react'
import { BookOpen, Search, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'
import { getCuadreConsolidado } from '../utils/api'

const hoy = new Date().toISOString().slice(0, 10)

const formatMonto = (v) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v || 0)

export default function CuadreContable() {
  const [fecha, setFecha] = useState(hoy)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const cargar = useCallback(async () => {
    if (!fecha) return
    setCargando(true)
    setError('')
    setDatos(null)
    try {
      const result = await getCuadreConsolidado(fecha)
      setDatos(result)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'No se encontró cuadre para esta fecha')
    } finally {
      setCargando(false)
    }
  }, [fecha])

  // Consolidar líneas por empleado + módulo + tipo, sumando montos
  const lineasConsolidadas = Object.values(
    (datos?.lineas || []).reduce((acc, l) => {
      const key = `${l.empleado}|${l.modulo}|${l.tipo}`
      if (!acc[key]) acc[key] = { ...l }
      else acc[key].monto += l.monto
      return acc
    }, {})
  )

  // Filtro de líneas sobre el consolidado
  const lineas = lineasConsolidadas.filter(l => {
    const texto = busqueda.toLowerCase()
    const coincideTexto = !texto ||
      l.empleado?.toLowerCase().includes(texto) ||
      l.modulo?.toLowerCase().includes(texto)
    const coincideTipo = filtroTipo === 'todos' || l.tipo === filtroTipo
    return coincideTexto && coincideTipo
  })

  const saldoPositivo = (datos?.saldo_final || 0) >= 0

  return (
    <div className="p-8 max-w-screen-2xl mx-auto relative min-h-screen">
      <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-violet-600" />
            Cuadre Contable Final
          </h1>
          <p className="text-gray-500 mt-1">Vista consolidada de todos los cuadres del día</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Caja azul: label + date + lupa */}
          <div className="bg-blue-600 p-2 pl-4 rounded-xl shadow-sm border border-blue-700 flex items-center gap-2">
            <label htmlFor="fecha-consolidado" className="font-bold text-white text-sm md:text-base whitespace-nowrap">
              FECHA DE CUADRE:
            </label>
            <input
              type="date"
              id="fecha-consolidado"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border-transparent rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 font-medium h-9 text-sm"
            />
            <button
              onClick={cargar}
              disabled={cargando}
              className="p-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Consultar"
            >
              {cargando
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Estado vacío inicial */}
      {!datos && !cargando && !error && (
        <div className="text-center py-20 text-gray-300">
          <BookOpen size={56} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium text-gray-400">Selecciona una fecha y pulsa Consultar</p>
        </div>
      )}

      {datos && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Empleados — violeta (primero) */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Empleados</span>
                <Users size={18} className="text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-violet-700">{datos.empleados_reportaron}</p>
              <p className="text-xs text-violet-400 mt-0.5">reportaron cuadre</p>
            </div>

            {/* Ingresos */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Ingresos</span>
                <TrendingUp size={18} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-700">{formatMonto(datos.total_ingresos)}</p>
            </div>

            {/* Egresos */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Egresos</span>
                <TrendingDown size={18} className="text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-700">{formatMonto(datos.total_egresos)}</p>
            </div>

            {/* Saldo Final — azul (último) */}
            <div className={`bg-gradient-to-br border rounded-2xl p-5 ${
              saldoPositivo
                ? 'from-blue-50 to-sky-50 border-blue-200'
                : 'from-orange-50 to-amber-50 border-orange-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${
                  saldoPositivo ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  Saldo Final
                </span>
                <DollarSign size={18} className={saldoPositivo ? 'text-blue-500' : 'text-orange-500'} />
              </div>
              <p className={`text-2xl font-bold ${
                saldoPositivo ? 'text-blue-700' : 'text-orange-700'
              }`}>
                {formatMonto(datos.saldo_final)}
              </p>
            </div>
          </div>

          {/* Filtros de detalle */}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Filtrar por empleado o módulo…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
            </div>
            <div className="flex gap-2">
              {['todos', 'Ingreso', 'Egreso'].map(t => (
                <button key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filtroTipo === t
                      ? t === 'Ingreso' ? 'bg-green-600 text-white'
                        : t === 'Egreso' ? 'bg-red-500 text-white'
                        : 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {t === 'todos' ? 'Todos' : t}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{lineas.length} líneas</span>
          </div>

          {/* Tabla de detalle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {lineas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No hay líneas para mostrar con los filtros actuales</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-center px-4 py-3 font-semibold text-gray-500 w-12">N°</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Empleado</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Módulo</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lineas.map((l, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-400 text-xs font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {l.empleado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{l.modulo}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span className={l.tipo === 'Ingreso' ? 'text-green-700' : 'text-red-600'}>
                            {formatMonto(l.monto)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            l.tipo === 'Ingreso'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {l.tipo === 'Ingreso' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {l.tipo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totales de la selección filtrada */}
                  {filtroTipo !== 'todos' && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">
                          Total {filtroTipo}s filtrados:
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${filtroTipo === 'Ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                          {formatMonto(lineas.reduce((s, l) => s + l.monto, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  )
}
