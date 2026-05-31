import {
  Fuel, Plus, Clock, User, Eye, Trash2, TrendingUp, TrendingDown,
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

export default function LiquidacionGriferoDesktop({
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
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mis Turnos - Liquidación</h1>
              <p className="text-sm text-gray-600 mt-1">
                <User className="w-4 h-4 inline mr-1" />
                {user?.nombres} {user?.apellidos}
              </p>
            </div>
            <div className="flex gap-3">
              {turnoActual && (
                <button
                  type="button"
                  onClick={() => irAlTurno(turnoActual.id)}
                  className="btn btn-success flex items-center gap-2"
                >
                  <Fuel className="w-5 h-5" />
                  Ver Turno Actual
                </button>
              )}
              <button
                type="button"
                onClick={abrirModalNuevoTurno}
                disabled={turnoActual !== null || turnosConfig.length === 0}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Turno
              </button>
            </div>
          </div>
        </div>
      </header>

      {mensaje && (
        <LiquidacionGriferoMensaje
          mensaje={mensaje}
          className="fixed top-20 right-4 z-50 animate-slide-in"
        />
      )}

      <div className="p-6">
        {turnoActual && (
          <div className="card p-6 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Clock className="w-4 h-4 mr-1" />
                    Turno Activo
                  </span>
                  <span className="text-sm text-gray-600">{turnoActual.codigo}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Turno en Progreso</h3>
                <p className="text-gray-800 font-medium">
                  Fecha del turno: {formatearSoloFecha(turnoActual.fecha_turno)}
                </p>
                <p className="text-gray-600 text-sm">
                  Registro en sistema — Inicio: {formatearFecha(turnoActual.fecha_hora_inicio)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => irAlTurno(turnoActual.id)}
                className="btn btn-primary flex items-center gap-2 px-6"
              >
                <Eye className="w-5 h-5" />
                Ir al Cuadre
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Turnos</h2>
            <p className="text-sm text-gray-600 mt-1">Todos tus turnos registrados en el sistema</p>
          </div>

          {turnos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fuel className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes turnos registrados</h3>
              <p className="text-gray-600 mb-4">
                Inicia tu primer turno para comenzar a registrar liquidaciones
              </p>
              <button
                type="button"
                onClick={abrirModalNuevoTurno}
                disabled={turnosConfig.length === 0}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Iniciar Primer Turno
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de turno (liquidación)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha del turno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grifero
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efectivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {turnos.map((turno) => (
                    <tr key={turno.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap max-w-xs">
                        <EtiquetaTurnoConfig texto={turno.turno_config_etiqueta} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {formatearSoloFecha(turno.fecha_turno)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">
                        {turno.empleado_nombre?.trim() || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(turno)}`}
                        >
                          {getEstadoTexto(turno)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            S/ {parseFloat(turno.efectivo_entregado || 0).toFixed(2)}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Esperado: S/ {parseFloat(turno.efectivo_esperado || 0).toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {esTurnoCerrado(turno) ? (
                          <div className="flex items-center gap-1">
                            {montoDiferencia(turno) === 0 ? (
                              <span className="text-sm font-medium text-green-600">
                                S/ {montoDiferencia(turno).toFixed(2)}
                              </span>
                            ) : montoDiferencia(turno) < 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-red-600">
                                  S/ {Math.abs(montoDiferencia(turno)).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-600">
                                  S/ {montoDiferencia(turno).toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => irAlTurno(turno.id)}
                            className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalle
                          </button>
                          {turnoGriferoEsAbierto(turno) && (
                            <button
                              type="button"
                              onClick={() => setTurnoAEliminar(turno)}
                              className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                              title="Eliminar turno abierto"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
