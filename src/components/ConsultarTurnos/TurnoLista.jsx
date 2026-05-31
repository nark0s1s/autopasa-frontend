import { useState, useMemo, useEffect } from 'react'
import {
  Fuel,
  LogOut,
  Trash2,
  FileText,
  Eye,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { NotificacionFlotante } from './NotificacionFlotante'
import { ModalEliminarTurnoCerrado } from './Modals/ModalEliminarTurnoCerrado'
import { formatearFechaTurno } from '../../utils/formatearFechaTurno'
import { turnoGriferoEsAbierto, turnoGriferoEsCerrado, turnoGriferoEsAuditado } from '../../utils/turnoGriferoEstado'
import { downloadTurnoGriferoReportePdf } from '../../utils/api'
import {
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  getEstadoLabel,
  getEstadoColor,
  montoDiferencia,
  nombreGrifero,
  buildPageNumbers,
  nombreTipoTurno,
  ordenarTurnosPorFechaDesc,
} from './turnoListaUtils'

export function TurnoLista({
  user,
  turnos,
  mensaje,
  onLogout,
  onSelectTurno,
  onMensaje,
  onOpenEliminarCerrado,
  turnoEliminarCerrado,
  textoConfirmarEliminarCerrado,
  onTextoConfirmarEliminarCerrado,
  eliminandoTurnoCerrado,
  onCancelEliminarCerrado,
  onConfirmEliminarCerrado,
}) {
  const [descargandoPdfId, setDescargandoPdfId] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const turnosOrdenados = useMemo(() => ordenarTurnosPorFechaDesc(turnos), [turnos])

  const totalTurnos = turnosOrdenados.length
  const totalPaginas = Math.max(1, Math.ceil(totalTurnos / pageSize))

  useEffect(() => {
    setPagina(1)
  }, [totalTurnos, pageSize])

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas)
  }, [pagina, totalPaginas])

  const turnosPagina = useMemo(() => {
    const inicio = (pagina - 1) * pageSize
    return turnosOrdenados.slice(inicio, inicio + pageSize)
  }, [turnosOrdenados, pagina, pageSize])

  const rangoInicio = totalTurnos === 0 ? 0 : (pagina - 1) * pageSize + 1
  const rangoFin = Math.min(pagina * pageSize, totalTurnos)
  const pageNumbers = buildPageNumbers(pagina, totalPaginas)

  const handleDownloadPdf = async (e, turnoId) => {
    e.stopPropagation()
    setDescargandoPdfId(turnoId)
    try {
      await downloadTurnoGriferoReportePdf(turnoId)
    } catch (err) {
      const d = err.response?.data
      let msg = 'No se pudo generar el PDF'
      if (d instanceof Blob) {
        try {
          const t = await d.text()
          const j = JSON.parse(t)
          msg = j.detail || msg
        } catch {
          /* ignore */
        }
      } else if (typeof d?.detail === 'string') msg = d.detail
      onMensaje?.(msg, 'error')
    } finally {
      setDescargandoPdfId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f3e0' }}>
      <header className="border-b border-gray-200 sticky top-0 z-10 shrink-0" style={{ backgroundColor: '#faf8e4' }}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Liquidación de Turnos</h1>
                <p className="text-sm text-gray-600">
                  {user?.nombres} {user?.apellidos}
                </p>
              </div>
            </div>
            <button type="button" onClick={onLogout} className="btn btn-secondary">
              <LogOut className="w-5 h-5 mr-2" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <NotificacionFlotante mensaje={mensaje} />

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Turnos del Día</h2>
          <p className="text-gray-600 text-sm">Selecciona un turno para ver sus detalles y liquidación</p>
          {user?.rol?.nombre === 'grifero' && (
            <p className="text-sm text-amber-800 mt-1">
              Solo se muestran tus turnos de grifero. Los perfiles de administración ven todos los turnos.
            </p>
          )}
        </div>

        <div className="card overflow-hidden">
          {totalTurnos === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fuel className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay turnos registrados</h3>
              <p className="text-gray-600">No se encontraron turnos para el día de hoy</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{totalTurnos}</span> turno{totalTurnos !== 1 ? 's' : ''}{' '}
                  · mostrando {rangoInicio}–{rangoFin} · página {pagina} de {totalPaginas}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    Filas por página
                    <select
                      className="input py-1.5 px-2 text-sm w-auto min-w-[4.5rem]"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary py-1.5 px-2.5 disabled:opacity-40"
                      disabled={pagina <= 1}
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {pageNumbers.map((n, idx) =>
                      n === '…' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={n}
                          type="button"
                          className={`min-w-[2.25rem] py-1.5 px-2 rounded-lg text-sm font-medium transition-colors ${
                            n === pagina
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setPagina(n)}
                        >
                          {n}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary py-1.5 px-2.5 disabled:opacity-40"
                      disabled={pagina >= totalPaginas}
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      title="Página siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[14%]">
                        Tipo de turno
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[12%]">
                        <span className="inline-flex items-center gap-1">
                          Fecha del turno
                          <span className="text-primary-600 normal-case font-semibold" title="Ordenado descendente">
                            ↓
                          </span>
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[9%]">
                        Código
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[14%]">
                        Grifero
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[8%]">
                        Estado
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[12%]">
                        Efectivo
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[10%]">
                        Diferencia
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-[10%]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {turnosPagina.map((t) => {
                      const diff = montoDiferencia(t)
                      const cerrado = turnoGriferoEsCerrado(t) || turnoGriferoEsAuditado(t)

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-primary-50/40 transition-colors cursor-pointer"
                          onClick={() => onSelectTurno(t.id)}
                        >
                          <td className="px-3 py-2.5 text-gray-900 align-top">
                            <span className="font-semibold text-primary-800 tracking-wide">
                              {nombreTipoTurno(t)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-800 align-top whitespace-nowrap tabular-nums">
                            {formatearFechaTurno(t.fecha_turno)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-900 align-top whitespace-nowrap">
                            {t.codigo}
                          </td>
                          <td className="px-3 py-2.5 text-gray-800 align-top">{nombreGrifero(t)}</td>
                          <td className="px-3 py-2.5 align-top whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(t)}`}
                            >
                              {getEstadoLabel(t)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top whitespace-nowrap tabular-nums">
                            <div className="font-medium text-gray-900">
                              S/ {parseFloat(t.efectivo_entregado || 0).toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Esp.: S/ {parseFloat(t.efectivo_esperado || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top whitespace-nowrap">
                            {cerrado ? (
                              <div className="flex items-center gap-1">
                                {diff === 0 ? (
                                  <span className="font-medium text-green-600 tabular-nums">S/ {diff.toFixed(2)}</span>
                                ) : diff < 0 ? (
                                  <>
                                    <TrendingDown className="w-4 h-4 text-red-600 shrink-0" />
                                    <span className="font-medium text-red-600 tabular-nums">
                                      S/ {Math.abs(diff).toFixed(2)}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-4 h-4 text-orange-600 shrink-0" />
                                    <span className="font-medium text-orange-600 tabular-nums">
                                      S/ {diff.toFixed(2)}
                                    </span>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right align-top whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectTurno(t.id)
                                }}
                                className="p-1.5 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Ver detalle del turno"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDownloadPdf(e, t.id)}
                                disabled={descargandoPdfId === t.id}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Descargar reporte PDF"
                              >
                                {descargandoPdfId === t.id ? (
                                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </button>
                              {turnoGriferoEsCerrado(t) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onOpenEliminarCerrado(t)
                                  }}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar turno cerrado"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            </>
          )}
        </div>
      </div>

      <ModalEliminarTurnoCerrado
        turno={turnoEliminarCerrado}
        textoConfirmacion={textoConfirmarEliminarCerrado}
        onTextoConfirmacionChange={onTextoConfirmarEliminarCerrado}
        eliminando={eliminandoTurnoCerrado}
        onCancel={onCancelEliminarCerrado}
        onConfirmar={onConfirmEliminarCerrado}
      />
    </div>
  )
}
