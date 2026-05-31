import { CheckCircle, AlertCircle } from 'lucide-react'

const PLACEMENT_CLASS = {
  'top-right': 'fixed top-20 right-4 z-50 animate-slide-in',
  bottom: 'fixed bottom-4 left-4 right-4 z-50',
}

export function NotificacionFlotante({ mensaje, placement = 'top-right' }) {
  if (!mensaje) return null
  return (
    <div
      role="status"
      className={`${PLACEMENT_CLASS[placement] || PLACEMENT_CLASS['top-right']} ${
        mensaje.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}
    >
      {mensaje.tipo === 'success' ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}
      <span className="whitespace-pre-line">{mensaje.texto}</span>
    </div>
  )
}
