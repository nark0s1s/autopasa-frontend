import {
  Fuel, Plus, Clock, User, Eye, Trash2, TrendingUp, TrendingDown, ChevronRight,
} from 'lucide-react'
import EtiquetaTurnoConfig from '../components/EtiquetaTurnoConfig'
import { turnoGriferoEsAbierto } from '../utils/turnoGriferoEstado'
import {
  getEstadoColor,
  getEstadoTexto,
  esTurnoCerrado,
  montoDiferencia,
  formatearFecha,
  formatearSoloFecha,
} from './liquidacionGriferoUtils'
import {
  LiquidacionGriferoMensaje,
  LiquidacionGriferoModalEliminar,
  LiquidacionGriferoModalNuevoTurno,
} from './LiquidacionGriferoShared'

function DiferenciaBadge({ turno }) {
  if (!esTurnoCerrado(turno)) {
    return <span className="text-sm text-gray-400">—</span>
  }
  const diff = montoDiferencia(turno)
  if (diff === 0) {
    return <span className="text-sm font-semibold text-green-600">S/ {diff.toFixed(2)}</span>
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
        <TrendingDown className="w-4 h-4" />
        S/ {Math.abs(diff).toFixed(2)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
      <TrendingUp className="w-4 h-4" />
      S/ {diff.toFixed(2)}
    </span>
  )
}

function TurnoCard({ turno, onVer, onEliminar }) {
  return (
    <article className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:bg-gray-50">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <EtiquetaTurnoConfig texto={turno.turno_config_etiqueta} />
          <p className="text-xs text-gray-500 mt-1 font-mono">{turno.codigo}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${getEstadoColor(turno)}`}
        >
          {getEstadoTexto(turno)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mb-4">
        <div>
          <dt className="text-xs text-gray-500">Fecha turno</dt>
          <dd className="font-medium text-gray-900">{formatearSoloFecha(turno.fecha_turno)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Grifero</dt>
          <dd className="font-medium text-gray-900 truncate">{turno.empleado_nombre?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Efectivo</dt>
          <dd className="font-medium text-gray-900">S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}</dd>
          <dd className="text-xs text-gray-500">
            Esp.: S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Diferencia</dt>
          <dd><DiferenciaBadge turno={turno} /></dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onVer(turno.id)}
          className="btn btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5"
        >
          <Eye className="w-4 h-4" />
          Ver cuadre
          <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
        </button>
        {turnoGriferoEsAbierto(turno) && (
          <button
            type="button"
            onClick={() => onEliminar(turno)}
            className="btn btn-secondary w-full inline-flex items-center justify-center gap-2 py-2.5 text-red-700 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar turno
          </button>
        )}
      </div>
    </article>
  )
}

export default function LiquidacionGriferoMobile({
  user,
  turnos,
  turnoActual,
  mensaje,
  iniciandoTurno,
  mostrarModal,
  setMostrarModal,
  turnosConfig,
  turnoConfigIdModal,
  setTurnoConfigIdModal,
  fechaTurnoModal,
  setFechaTurnoModal,
  turnoAEliminar,
  setTurnoAEliminar,
  eliminandoTurno,
  abrirModalNuevoTurno,
  handleIniciarTurno,
  handleConfirmarEliminarTurno,
  irAlTurno,
}) {
  const puedeNuevoTurno = turnoActual === null && turnosConfig.length > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Mis Turnos</h1>
          <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {user?.nombres} {user?.apellidos}
            </span>
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {turnoActual && (
              <button
                type="button"
                onClick={() => irAlTurno(turnoActual.id)}
                className="btn btn-success w-full inline-flex items-center justify-center gap-2 py-2.5"
              >
                <Fuel className="w-4 h-4" />
                Ver turno actual
              </button>
            )}
            <button
              type="button"
              onClick={abrirModalNuevoTurno}
              disabled={!puedeNuevoTurno}
              className="btn btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5"
            >
              <Plus className="w-4 h-4" />
              Nuevo turno
            </button>
          </div>
        </div>
      </header>

      {mensaje && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <LiquidacionGriferoMensaje mensaje={mensaje} />
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {turnoActual && (
          <section className="rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Turno activo
              </span>
              <span className="text-xs text-gray-600 font-mono">{turnoActual.codigo}</span>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Turno en progreso</h2>
            <p className="text-sm text-gray-800">
              Fecha: {formatearSoloFecha(turnoActual.fecha_turno)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Inicio: {formatearFecha(turnoActual.fecha_hora_inicio)}
            </p>
            <button
              type="button"
              onClick={() => irAlTurno(turnoActual.id)}
              className="btn btn-primary w-full mt-3 inline-flex items-center justify-center gap-2 py-2.5"
            >
              <Eye className="w-4 h-4" />
              Ir al cuadre
            </button>
          </section>
        )}

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900">Historial de turnos</h2>
            <p className="text-xs text-gray-600">Tus turnos registrados en el sistema</p>
          </div>

          {turnos.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Fuel className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">Sin turnos registrados</h3>
              <p className="text-sm text-gray-600 mb-4">
                Inicia tu primer turno para comenzar a liquidar
              </p>
              <button
                type="button"
                onClick={abrirModalNuevoTurno}
                disabled={turnosConfig.length === 0}
                className="btn btn-primary w-full inline-flex items-center justify-center gap-2 py-2.5"
              >
                <Plus className="w-4 h-4" />
                Iniciar primer turno
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {turnos.map((turno) => (
                <TurnoCard
                  key={turno.id}
                  turno={turno}
                  onVer={irAlTurno}
                  onEliminar={setTurnoAEliminar}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <LiquidacionGriferoModalEliminar
        turnoAEliminar={turnoAEliminar}
        eliminandoTurno={eliminandoTurno}
        onCancel={() => setTurnoAEliminar(null)}
        onConfirm={handleConfirmarEliminarTurno}
      />

      <LiquidacionGriferoModalNuevoTurno
        mostrarModal={mostrarModal}
        user={user}
        turnosConfig={turnosConfig}
        turnoConfigIdModal={turnoConfigIdModal}
        setTurnoConfigIdModal={setTurnoConfigIdModal}
        fechaTurnoModal={fechaTurnoModal}
        setFechaTurnoModal={setFechaTurnoModal}
        iniciandoTurno={iniciandoTurno}
        onClose={() => setMostrarModal(false)}
        onConfirm={handleIniciarTurno}
      />
    </div>
  )
}
