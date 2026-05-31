import { useState } from 'react'
import {
  Fuel,
  LogOut,
  CheckCircle,
  FileText,
  Trash2,
  Unlock,
  ChevronLeft,
} from 'lucide-react'
import { downloadTurnoGriferoReportePdf } from '../../utils/api'
import { turnoGriferoEsAbierto, turnoGriferoEsCerrado } from '../../utils/turnoGriferoEstado'
import { formatearFechaTurno } from '../../utils/formatearFechaTurno'
import { puedeVerPanelReaperturaCorreccion } from '../../utils/reaperturaTurnoCorreccion'
import { NotificacionFlotante } from './NotificacionFlotante'
import { ResumenTotalesMobile } from './ResumenTotalesMobile'
import { ModalEliminarTurnoCerrado } from './Modals/ModalEliminarTurnoCerrado'
import { ModalCierre } from './Modals/ModalCierre'
import { PanelReaperturaCorreccion } from './PanelReaperturaCorreccion'
import { TurnoDetalleTabPanels } from './TurnoDetalleTabPanels'
import { TAB_CONFIG } from './consultarTurnosShared'

export function TurnoDetalleMobile({
  permisosApi,
  turno,
  mensaje,
  totales,
  contometros,
  productos,
  tiposVale,
  tabActiva,
  setTabActiva,
  showModalCierre,
  setShowModalCierre,
  onVolver,
  onLogout,
  onMensaje,
  onReload,
  onOpenEliminarCerrado,
  turnoEliminarCerrado,
  textoConfirmarEliminarCerrado,
  onTextoConfirmarEliminarCerrado,
  eliminandoTurnoCerrado,
  onCancelEliminarCerrado,
  onConfirmEliminarCerrado,
  onCierreSuccess,
  user,
}) {
  const puedeReaperturaCorreccion =
    puedeVerPanelReaperturaCorreccion(permisosApi, user) === true

  const irPanelReaperturaCorreccion = () => {
    document.getElementById('panel-reapertura-correccion')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const tabActual = TAB_CONFIG.find((t) => t.id === tabActiva)

  const handleDownloadPdf = async () => {
    setDescargandoPdf(true)
    try {
      await downloadTurnoGriferoReportePdf(turno.id)
    } catch (e) {
      const d = e.response?.data
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
      onMensaje(msg, 'error')
    } finally {
      setDescargandoPdf(false)
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#f5f3e0' }}>
      <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#faf8e4' }}>
        <div className="px-3 py-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onVolver}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0 mt-0.5"
              title="Volver a la lista"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                  <Fuel className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-base font-bold text-gray-900 truncate">Cuadre de turno</h1>
              </div>
              <p className="text-xs text-gray-600 mt-1 truncate">
                {turno.empleado?.nombres} {turno.empleado?.apellidos} · {turno.codigo}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Fecha: {formatearFechaTurno(turno.fecha_turno)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs py-2 inline-flex items-center justify-center gap-1.5"
              onClick={handleDownloadPdf}
              disabled={descargandoPdf}
            >
              {descargandoPdf ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              PDF
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-secondary text-xs py-2 inline-flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
            {turnoGriferoEsCerrado(turno) && (
              <button
                type="button"
                className="btn btn-danger col-span-2 text-xs py-2 inline-flex items-center justify-center gap-1.5"
                onClick={() => onOpenEliminarCerrado(turno)}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar turno cerrado
              </button>
            )}
          </div>
        </div>
      </header>

      <NotificacionFlotante mensaje={mensaje} placement="bottom" />

      <ModalEliminarTurnoCerrado
        turno={turnoEliminarCerrado}
        textoConfirmacion={textoConfirmarEliminarCerrado}
        onTextoConfirmacionChange={onTextoConfirmarEliminarCerrado}
        eliminando={eliminandoTurnoCerrado}
        onCancel={onCancelEliminarCerrado}
        onConfirmar={onConfirmEliminarCerrado}
      />

      <div className="px-3 py-4">
        <ResumenTotalesMobile totales={totales} />

        <div id="panel-reapertura-correccion" className="mb-4">
          <PanelReaperturaCorreccion
            turno={turno}
            user={user}
            permisosApi={permisosApi}
            onMensaje={onMensaje}
            onReload={onReload}
          />
        </div>

        <div className="card mb-4 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50/80">
            <label htmlFor="tab-turno-mobile" className="block text-xs font-medium text-gray-600 mb-1.5">
              Sección del cuadre
            </label>
            <select
              id="tab-turno-mobile"
              className="input w-full text-sm py-2.5"
              value={tabActiva}
              onChange={(e) => setTabActiva(e.target.value)}
            >
              {TAB_CONFIG.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            {tabActual && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <tabActual.icon className="w-3.5 h-3.5 shrink-0" />
                {tabActual.label}
              </p>
            )}
          </div>

          <TurnoDetalleTabPanels
            tabActiva={tabActiva}
            turno={turno}
            contometros={contometros}
            productos={productos}
            tiposVale={tiposVale}
            onReload={onReload}
            onMensaje={onMensaje}
            contentClassName="p-3"
          />
        </div>

        {turnoGriferoEsAbierto(turno) && totales && (
          <div className="card p-4 mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">¿Listo para cerrar?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Efectivo esperado:{' '}
              <span className="font-bold tabular-nums">S/ {totales.efectivoEsperado.toFixed(2)}</span>
            </p>
            <button
              type="button"
              onClick={() => setShowModalCierre(true)}
              className="btn btn-success w-full inline-flex items-center justify-center gap-2 py-2.5"
            >
              <CheckCircle className="w-5 h-5" />
              Cerrar turno
            </button>
          </div>
        )}

        {turnoGriferoEsCerrado(turno) && (
          <div
            className={`card p-4 ${
              parseFloat(turno.diferencia || 0) === 0
                ? 'bg-green-50 border-green-200'
                : parseFloat(turno.diferencia || 0) < 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">
                {parseFloat(turno.diferencia || 0) === 0
                  ? '✅ Turno cuadrado'
                  : parseFloat(turno.diferencia || 0) < 0
                    ? '❌ Turno con faltante'
                    : '⚠️ Turno con sobrante'}
              </h3>
              <p className="text-base mb-3">
                Diferencia:{' '}
                <span className="font-bold tabular-nums">S/ {parseFloat(turno.diferencia || 0).toFixed(2)}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/60 p-2">
                  <p className="text-xs text-gray-600">Esperado</p>
                  <p className="text-base font-bold tabular-nums">
                    S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/60 p-2">
                  <p className="text-xs text-gray-600">Entregado</p>
                  <p className="text-base font-bold tabular-nums">
                    S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              {puedeReaperturaCorreccion && (
                <div className="mt-4 pt-4 border-t border-gray-200/80">
                  <p className="text-xs text-gray-700 mb-3 text-left">
                    Si debe corregir el cuadre con consolidación en pendiente, use la reapertura guiada más abajo.
                  </p>
                  <button
                    type="button"
                    onClick={irPanelReaperturaCorreccion}
                    className="btn btn-secondary w-full inline-flex items-center justify-center gap-2 text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100 text-sm py-2.5"
                  >
                    <Unlock className="w-4 h-4 shrink-0" aria-hidden />
                    Reabrir / corrección
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModalCierre && totales && (
        <ModalCierre
          turno={turno}
          totales={totales}
          onClose={() => setShowModalCierre(false)}
          onSuccess={onCierreSuccess}
        />
      )}
    </div>
  )
}
