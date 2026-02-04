import { Construction } from 'lucide-react'

function ProximamentePage({ titulo = "Función en Desarrollo" }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f5f3e0' }}>
      <div className="text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="w-12 h-12 text-amber-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{titulo}</h2>
        <p className="text-lg text-gray-600 mb-2">Esta funcionalidad estará disponible próximamente</p>
        <p className="text-sm text-gray-500">Estamos trabajando para traértela lo antes posible</p>
      </div>
    </div>
  )
}

export default ProximamentePage
