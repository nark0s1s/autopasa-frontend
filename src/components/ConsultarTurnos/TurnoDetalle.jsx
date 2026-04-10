import {
  Fuel,
  LogOut,
  CheckCircle,
  FileText,
  Trash2,
  Gauge,
  ShoppingCart,
  CreditCard,
  Receipt,
  DollarSign,
  Percent,
} from 'lucide-react'
import { downloadTurnoGriferoReportePdf } from '../../utils/api'
import { formatearFechaTurno } from '../../utils/formatearFechaTurno'
import { NotificacionFlotante } from './NotificacionFlotante'
import { ResumenTotales } from './ResumenTotales'
import { ModalEliminarTurnoCerrado } from './Modals/ModalEliminarTurnoCerrado'
import { ModalCierre } from './Modals/ModalCierre'
import { TabLecturas } from './Tabs/TabLecturas'
import { TabVentas } from './Tabs/TabVentas'
import { TabPOS } from './Tabs/TabPOS'
import { TabVentasGuia } from './Tabs/TabVentasGuia'
import { TabVales } from './Tabs/TabVales'
import { TabDescuentos } from './Tabs/TabDescuentos'
import { TabDepositos } from './Tabs/TabDepositos'

const TAB_CONFIG = [
  { id: 'lecturas', label: 'Lecturas Contómetro', icon: Gauge },
  { id: 'ventas', label: 'Ventas Productos', icon: ShoppingCart },
  { id: 'pos', label: 'Ventas POS', icon: CreditCard },
  { id: 'guia_credito', label: 'Guía crédito', icon: FileText },
  { id: 'guia_remision', label: 'Guía remisión', icon: FileText },
  { id: 'vales', label: 'Vales', icon: Receipt },
  { id: 'descuentos', label: 'Descuentos', icon: Percent },
  { id: 'depositos', label: 'Depósitos', icon: DollarSign },
]

export function TurnoDetalle({
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
}) {
  const handleDownloadPdf = async () => {
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
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f3e0' }}>
      <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#faf8e4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onVolver}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver a la lista"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Liquidación de Turno</h1>
                <p className="text-sm text-gray-600">
                  {turno.empleado?.nombres} {turno.empleado?.apellidos} • {turno.codigo}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fecha del turno: {formatearFechaTurno(turno.fecha_turno)} · Registro inicio:{' '}
                  {new Date(turno.fecha_hora_inicio).toLocaleString('es-PE')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-2"
                onClick={handleDownloadPdf}
              >
                <FileText className="w-5 h-5" />
                Descargar PDF
              </button>
              {turno.estado_id === 2 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => onOpenEliminarCerrado(turno)}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Eliminar turno cerrado
                </button>
              )}
              <button type="button" onClick={onLogout} className="btn btn-secondary">
                <LogOut className="w-5 h-5 mr-2" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <NotificacionFlotante mensaje={mensaje} />

      <ModalEliminarTurnoCerrado
        turno={turnoEliminarCerrado}
        textoConfirmacion={textoConfirmarEliminarCerrado}
        onTextoConfirmacionChange={onTextoConfirmarEliminarCerrado}
        eliminando={eliminandoTurnoCerrado}
        onCancel={onCancelEliminarCerrado}
        onConfirmar={onConfirmEliminarCerrado}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ResumenTotales totales={totales} />

        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTabActiva(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    tabActiva === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {tabActiva === 'lecturas' && (
              <TabLecturas
                turno={turno}
                contometros={contometros}
                onReload={onReload}
                onMensaje={onMensaje}
              />
            )}
            {tabActiva === 'ventas' && (
              <TabVentas
                turno={turno}
                productos={productos}
                onReload={onReload}
                onMensaje={onMensaje}
              />
            )}
            {tabActiva === 'pos' && (
              <TabPOS turno={turno} onReload={onReload} onMensaje={onMensaje} />
            )}
            {tabActiva === 'guia_credito' && (
              <TabVentasGuia turno={turno} tipo="credito" onReload={onReload} onMensaje={onMensaje} />
            )}
            {tabActiva === 'guia_remision' && (
              <TabVentasGuia turno={turno} tipo="remision" onReload={onReload} onMensaje={onMensaje} />
            )}
            {tabActiva === 'vales' && (
              <TabVales turno={turno} tiposVale={tiposVale} onReload={onReload} onMensaje={onMensaje} />
            )}
            {tabActiva === 'descuentos' && (
              <TabDescuentos turno={turno} onReload={onReload} onMensaje={onMensaje} />
            )}
            {tabActiva === 'depositos' && (
              <TabDepositos turno={turno} onReload={onReload} onMensaje={onMensaje} />
            )}
          </div>
        </div>

        {turno.estado_id === 1 && totales && (
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">¿Listo para cerrar el turno?</h3>
                <p className="text-gray-600">
                  Efectivo esperado:{' '}
                  <span className="font-bold">S/ {totales.efectivoEsperado.toFixed(2)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModalCierre(true)}
                className="btn btn-success flex items-center gap-2 px-6 py-3"
              >
                <CheckCircle className="w-5 h-5" />
                Cerrar Turno
              </button>
            </div>
          </div>
        )}

        {turno.estado_id === 2 && (
          <div
            className={`card p-6 ${
              parseFloat(turno.diferencia || 0) === 0
                ? 'bg-green-50 border-green-200'
                : parseFloat(turno.diferencia || 0) < 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">
                {parseFloat(turno.diferencia || 0) === 0
                  ? '✅ Turno Cuadrado'
                  : parseFloat(turno.diferencia || 0) < 0
                    ? '❌ Turno con Faltante'
                    : '⚠️ Turno con Sobrante'}
              </h3>
              <p className="text-lg mb-4">
                Diferencia:{' '}
                <span className="font-bold">S/ {parseFloat(turno.diferencia || 0).toFixed(2)}</span>
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div>
                  <p className="text-sm text-gray-600">Efectivo Esperado</p>
                  <p className="text-xl font-bold">S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efectivo Entregado</p>
                  <p className="text-xl font-bold">S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}</p>
                </div>
              </div>
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
