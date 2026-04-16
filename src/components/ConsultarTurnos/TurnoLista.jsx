import { Fuel, LogOut, Gauge, Trash2 } from 'lucide-react'
import { NotificacionFlotante } from './NotificacionFlotante'
import { ModalEliminarTurnoCerrado } from './Modals/ModalEliminarTurnoCerrado'
import { formatearFechaTurno } from '../../utils/formatearFechaTurno'
import { turnoGriferoEsAbierto, turnoGriferoEsCerrado, turnoGriferoEsAuditado } from '../../utils/turnoGriferoEstado'

export function TurnoLista({
  user,
  turnos,
  mensaje,
  onLogout,
  onSelectTurno,
  onOpenEliminarCerrado,
  turnoEliminarCerrado,
  textoConfirmarEliminarCerrado,
  onTextoConfirmarEliminarCerrado,
  eliminandoTurnoCerrado,
  onCancelEliminarCerrado,
  onConfirmEliminarCerrado,
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f3e0' }}>
      <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#faf8e4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Turnos del Día</h2>
          <p className="text-gray-600">Selecciona un turno para ver sus detalles y liquidación</p>
          {user?.rol?.nombre === 'grifero' && (
            <p className="text-sm text-amber-800 mt-2">
              Solo se muestran tus turnos de grifero. Los perfiles de administración ven todos los turnos.
            </p>
          )}
        </div>

        {turnos.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fuel className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay turnos registrados</h3>
            <p className="text-gray-600">No se encontraron turnos para el día de hoy</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turnos.map((t) => {
              const estadoLabel =
                (t.estado_nombre && String(t.estado_nombre).trim()) ||
                (turnoGriferoEsAbierto(t) ? 'Abierto' : turnoGriferoEsCerrado(t) ? 'Cerrado' : turnoGriferoEsAuditado(t) ? 'Auditado' : '—')
              const estadoColor = turnoGriferoEsAbierto(t)
                ? 'bg-green-100 text-green-800'
                : turnoGriferoEsCerrado(t)
                  ? 'bg-red-100 text-red-800'
                  : turnoGriferoEsAuditado(t)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'

              return (
                <div
                  key={t.id}
                  className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onSelectTurno(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectTurno(t.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Gauge className="w-6 h-6 text-primary-600" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${estadoColor}`}>
                      {estadoLabel}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t.codigo}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {t.empleado?.nombres} {t.empleado?.apellidos}
                  </p>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">
                      Fecha del turno: {formatearFechaTurno(t.fecha_turno)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Registro — Inicio: {new Date(t.fecha_hora_inicio).toLocaleString('es-PE')}
                    </p>
                    {t.fecha_hora_fin && (
                      <p className="text-xs text-gray-500">
                        Registro — Fin: {new Date(t.fecha_hora_fin).toLocaleString('es-PE')}
                      </p>
                    )}
                  </div>

                  <button type="button" className="btn btn-primary w-full mt-4">
                    Ver Detalles
                  </button>
                  {turnoGriferoEsCerrado(t) && (
                    <button
                      type="button"
                      className="btn btn-danger w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenEliminarCerrado(t)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2 inline" />
                      Eliminar turno cerrado
                    </button>
                  )}
                </div>
              )
            })}
          </div>
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
