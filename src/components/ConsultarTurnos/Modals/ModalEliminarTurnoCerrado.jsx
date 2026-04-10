import { AlertTriangle } from 'lucide-react'

export function ModalEliminarTurnoCerrado({
  turno,
  textoConfirmacion,
  onTextoConfirmacionChange,
  eliminando,
  onCancel,
  onConfirmar,
}) {
  if (!turno) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="card p-6 max-w-lg w-full border-2 border-red-200 shadow-xl">
        <div className="flex gap-3 mb-4">
          <AlertTriangle className="w-10 h-10 text-red-600 shrink-0" aria-hidden />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Eliminar turno cerrado</h3>
            <p className="text-sm text-gray-700 mt-2">
              Va a eliminar de forma <strong>permanente</strong> un turno que ya está{' '}
              <strong>cerrado</strong>: <strong>{turno.codigo}</strong>. Se borrarán todos los datos de
              liquidación vinculados (lecturas, ventas, guías, depósitos, cierre, etc.). Esta acción{' '}
              <strong>no se puede deshacer</strong>.
            </p>
            <p className="text-sm font-semibold text-red-800 mt-3">
              Escriba exactamente <span className="font-mono bg-red-50 px-1 rounded">CONFIRMAR</span> para
              habilitar el botón de eliminación.
            </p>
          </div>
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmación</label>
        <input
          type="text"
          className="input font-mono mb-4"
          placeholder="CONFIRMAR"
          value={textoConfirmacion}
          onChange={(e) => onTextoConfirmacionChange(e.target.value)}
          autoComplete="off"
          disabled={eliminando}
        />
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary flex-1" disabled={eliminando} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger flex-1"
            disabled={eliminando || textoConfirmacion.trim() !== 'CONFIRMAR'}
            onClick={onConfirmar}
          >
            {eliminando ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </div>
    </div>
  )
}
