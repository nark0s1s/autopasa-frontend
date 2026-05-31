import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle, AlertCircle, Fuel, Trash2 } from 'lucide-react'

export function LiquidacionGriferoMensaje({ mensaje, className = '' }) {
  if (!mensaje) return null
  return (
    <div
      role="status"
      className={`${mensaje.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${className}`}
    >
      {mensaje.tipo === 'success' ? (
        <CheckCircle className="w-5 h-5 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0" />
      )}
      <span className="text-sm">{mensaje.texto}</span>
    </div>
  )
}

export function LiquidacionGriferoModalEliminar({
  turnoAEliminar,
  eliminandoTurno,
  onCancel,
  onConfirm,
}) {
  if (!turnoAEliminar) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar turno abierto</h3>
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar el turno <strong>{turnoAEliminar.codigo}</strong>? Se borrarán las lecturas, ventas y demás
          registros asociados. Esta acción no se puede deshacer.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            className="btn btn-secondary flex-1"
            disabled={eliminandoTurno}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger flex-1 inline-flex items-center justify-center gap-2"
            disabled={eliminandoTurno}
            onClick={onConfirm}
          >
            {eliminandoTurno ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Eliminando…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function LiquidacionGriferoModalNuevoTurno({
  mostrarModal,
  user,
  turnosConfig,
  turnoConfigIdModal,
  setTurnoConfigIdModal,
  fechaTurnoModal,
  setFechaTurnoModal,
  iniciandoTurno,
  onClose,
  onConfirm,
}) {
  if (!mostrarModal) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="card p-5 sm:p-8 max-w-md w-full rounded-t-xl sm:rounded-xl max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Fuel className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Iniciar Nuevo Turno</h3>
          <p className="text-gray-600 text-sm">Se creará un nuevo turno de liquidación a tu nombre</p>
        </div>

        <div className="mb-4 text-left space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha operativa del turno *
            </label>
            <input
              type="date"
              className="input w-full"
              value={fechaTurnoModal}
              onChange={(e) => setFechaTurnoModal(e.target.value)}
              max="2099-12-31"
            />
            <p className="text-xs text-gray-500 mt-1">
              Fecha del día que se está liquidando (puede ser pasada). La hora de apertura/cierre en sistema será la
              de hoy al registrar.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de turno / liquidación del día *
            </label>
            <select
              className="input w-full"
              value={turnoConfigIdModal}
              onChange={(e) => setTurnoConfigIdModal(e.target.value)}
            >
              <option value="">— Seleccione —</option>
              {turnosConfig.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </select>
            {turnosConfig.length === 0 && (
              <p className="text-xs text-amber-700 mt-2">
                No hay tipos de turno activos. Configure en Mantenimiento → Turnos (configuración).
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-sm text-gray-600">Grifero:</span>
            <span className="text-sm font-medium text-gray-900 text-right">
              {user?.nombres} {user?.apellidos}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-sm text-gray-600">Fecha operativa:</span>
            <span className="text-sm font-medium text-gray-900 text-right">
              {fechaTurnoModal
                ? format(new Date(`${fechaTurnoModal}T12:00:00`), "d 'de' MMMM yyyy", { locale: es })
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-600">Registro — hora de apertura:</span>
            <span className="text-sm font-medium text-gray-900">{format(new Date(), 'HH:mm')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={iniciandoTurno}
            className="btn btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={iniciandoTurno || !turnoConfigIdModal}
            className="btn btn-primary flex-1 inline-flex items-center justify-center"
          >
            {iniciandoTurno ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Iniciando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function LiquidacionGriferoLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  )
}
