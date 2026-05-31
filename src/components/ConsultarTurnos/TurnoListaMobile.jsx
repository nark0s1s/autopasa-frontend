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
import { turnoGriferoEsCerrado } from '../../utils/turnoGriferoEstado'
import { downloadTurnoGriferoReportePdf } from '../../utils/api'
import {
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  getEstadoLabel,
  getEstadoColor,
  montoDiferencia,
  nombreGrifero,
  nombreTipoTurno,
  ordenarTurnosPorFechaDesc,
} from './turnoListaUtils'

function TurnoCardMobile({ turno, onSelect, onDownloadPdf, onEliminar, descargandoPdf }) {
  const diff = montoDiferencia(turno)
  const cerrado = turnoGriferoEsCerrado(turno)

  return (
    <article
      className="card p-4 active:bg-primary-50/30"
      onClick={() => onSelect(turno.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(turno.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-primary-800 text-sm">{nombreTipoTurno(turno)}</p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">{turno.codigo}</p>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getEstadoColor(turno)}`}
        >
          {getEstadoLabel(turno)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mb-3">
        <div>
          <dt className="text-xs text-gray-500">Fecha turno</dt>
          <dd className="font-medium text-gray-900 tabular-nums">{formatearFechaTurno(turno.fecha_turno)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Grifero</dt>
          <dd className="font-medium text-gray-900 truncate">{nombreGrifero(turno)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Efectivo</dt>
          <dd className="font-medium text-gray-900 tabular-nums">
            S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}
          </dd>
          <dd className="text-xs text-gray-500 tabular-nums">
            Esp.: S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Diferencia</dt>
          <dd>
            {cerrado ? (
              diff === 0 ? (
                <span className="font-semibold text-green-600 tabular-nums text-sm">S/ {diff.toFixed(2)}</span>
              ) : diff < 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-red-600 tabular-nums text-sm">
                  <TrendingDown className="w-3.5 h-3.5" />
                  S/ {Math.abs(diff).toFixed(2)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-orange-600 tabular-nums text-sm">
                  <TrendingUp className="w-3.5 h-3.5" />
                  S/ {diff.toFixed(2)}
                </span>
              )
            ) : (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onSelect(turno.id)}
          className="btn btn-primary flex-1 text-xs py-2 inline-flex items-center justify-center gap-1.5"
        >
          <Eye className="w-4 h-4" />
          Ver cuadre
        </button>
        <button
          type="button"
          onClick={() => onDownloadPdf(turno.id)}
          disabled={descargandoPdf}
          className="btn btn-secondary px-3 py-2"
          title="Descargar PDF"
        >
          {descargandoPdf ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </button>
        {cerrado && (
          <button
            type="button"
            onClick={() => onEliminar(turno)}
            className="btn btn-secondary px-3 py-2 text-red-700 border-red-200"
            title="Eliminar turno cerrado"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </article>
  )
}

export function TurnoListaMobile({
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

  const handleDownloadPdf = async (turnoId) => {
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
    <div className="min-h-screen flex flex-col pb-6" style={{ backgroundColor: '#f5f3e0' }}>
      <header className="border-b border-gray-200 sticky top-0 z-10 shrink-0" style={{ backgroundColor: '#faf8e4' }}>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                <Fuel className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-900 truncate">Liquidación de turnos</h1>
                <p className="text-xs text-gray-600 truncate">
                  {user?.nombres} {user?.apellidos}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-secondary text-xs py-2 px-3 shrink-0 inline-flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <NotificacionFlotante mensaje={mensaje} placement="bottom" />

      <div className="flex-1 px-3 py-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900">Turnos</h2>
          <p className="text-xs text-gray-600">Selecciona un turno para ver el cuadre</p>
          {user?.rol?.nombre === 'grifero' && (
            <p className="text-xs text-amber-800 mt-1">Solo se muestran tus turnos de grifero.</p>
          )}
        </div>

        {totalTurnos === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Fuel className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No hay turnos registrados</h3>
            <p className="text-sm text-gray-600">No se encontraron turnos</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
              <span>
                {totalTurnos} turno{totalTurnos !== 1 ? 's' : ''} · {rangoInicio}–{rangoFin}
              </span>
              <label className="flex items-center gap-1.5">
                Por página
                <select
                  className="input py-1 px-2 text-xs w-auto"
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
            </div>

            <div className="space-y-3">
              {turnosPagina.map((t) => (
                <TurnoCardMobile
                  key={t.id}
                  turno={t}
                  onSelect={onSelectTurno}
                  onDownloadPdf={handleDownloadPdf}
                  onEliminar={onOpenEliminarCerrado}
                  descargandoPdf={descargandoPdfId === t.id}
                />
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1 py-2 inline-flex items-center justify-center gap-1 text-sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="text-xs text-gray-600 shrink-0">
                  {pagina} / {totalPaginas}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary flex-1 py-2 inline-flex items-center justify-center gap-1 text-sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
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
