import { CheckCircle, AlertCircle } from 'lucide-react'

export function NotificacionFlotante({ mensaje }) {
  if (!mensaje) return null
  return (
    <div
      className={`fixed top-20 right-4 z-50 ${
        mensaje.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`}
    >
      {mensaje.tipo === 'success' ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}
      {mensaje.texto}
    </div>
  )
}
