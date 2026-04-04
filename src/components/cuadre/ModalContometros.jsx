import { useState, useEffect } from 'react'
import { Trash2, PlusCircle, Save, X } from 'lucide-react'
import { getIslas } from '../../utils/api'

// Componente Modal Genérico
function ModalWrapper({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function ModalContometros({ isOpen, onClose, onSave, listaInicial = [] }) {
  const [listaContometros, setListaContometros] = useState(listaInicial)

  // Jerarquía: islas con surtidores y contómetros
  const [islas, setIslas] = useState([])
  const [cargando, setCargando] = useState(false)

  // Selección en cascada
  const [islaSeleccionada, setIslaSeleccionada] = useState('')

  // Contómetros filtrados según la isla seleccionada
  const [contometrosFiltrados, setContometrosFiltrados] = useState([])

  const [nuevo, setNuevo] = useState({
    contometroId: '',
    codigo: '',
    producto: '',
    lecturaInicial: '',
    lecturaFinal: '',
    galones: '',
    precio: '',
    monto: ''
  })

  // Cargar jerarquía islas → surtidores → contómetros desde API
  useEffect(() => {
    if (!isOpen) return

    const fetchIslas = async () => {
      setCargando(true)
      try {
        const data = await getIslas(true)
        setIslas(data || [])
      } catch (error) {
        console.warn('Error al cargar islas:', error)
        setIslas([])
      } finally {
        setCargando(false)
      }
    }

    fetchIslas()
  }, [isOpen])

  // Cuando cambia la isla, aplanar todos los contómetros de sus surtidores
  useEffect(() => {
    if (!islaSeleccionada) {
      setContometrosFiltrados([])
      resetNuevo()
      return
    }

    const isla = islas.find(i => i.id === parseInt(islaSeleccionada))
    if (!isla) return

    const todos = []
    isla.surtidores.forEach(sur => {
      sur.contometros.forEach(cnt => {
        todos.push({
          ...cnt,
          surtidorNombre: sur.nombre,
          surtidorCodigo: sur.codigo
        })
      })
    })
    setContometrosFiltrados(todos)
    resetNuevo()
  }, [islaSeleccionada, islas])

  useEffect(() => {
    if (isOpen) setListaContometros(listaInicial)
  }, [isOpen, listaInicial])

  // Cálculo automático de galones y monto
  useEffect(() => {
    const lI = parseFloat(nuevo.lecturaInicial)
    const lF = parseFloat(nuevo.lecturaFinal)
    const pr = parseFloat(nuevo.precio)

    if (!isNaN(lI) && !isNaN(lF) && !isNaN(pr) && lF >= lI) {
      const galones = lF - lI
      setNuevo(prev => ({
        ...prev,
        galones: galones.toFixed(2),
        monto: (galones * pr).toFixed(2)
      }))
    } else {
      setNuevo(prev => ({ ...prev, galones: '', monto: '' }))
    }
  }, [nuevo.lecturaFinal, nuevo.lecturaInicial, nuevo.precio])

  const resetNuevo = () => {
    setNuevo({ contometroId: '', codigo: '', producto: '', lecturaInicial: '', lecturaFinal: '', galones: '', precio: '', monto: '' })
  }

  const handleIslaChange = (e) => {
    setIslaSeleccionada(e.target.value)
  }

  const handleContometroChange = (e) => {
    const selectedId = parseInt(e.target.value)
    const selected = contometrosFiltrados.find(c => c.id === selectedId)

    if (selected) {
      setNuevo(prev => ({
        ...prev,
        contometroId: selected.id,
        codigo: selected.codigo,
        producto: selected.producto,
        lecturaInicial: selected.lectura_actual,
        lecturaFinal: '',
        galones: '',
        precio: selected.precio,
        monto: ''
      }))
    } else {
      resetNuevo()
    }
  }

  const handleInputChange = (field, value) => {
    setNuevo(prev => ({ ...prev, [field]: value }))
  }

  const agregarContometro = () => {
    if (!nuevo.contometroId || !nuevo.lecturaFinal || !nuevo.monto) return
    setListaContometros([...listaContometros, { ...nuevo, id: Date.now() }])
    resetNuevo()
    // Mantener la isla seleccionada para agilizar el ingreso de múltiples contómetros
  }

  const eliminarContometro = (id) => {
    setListaContometros(listaContometros.filter(c => c.id !== id))
  }

  const handleSave = () => {
    onSave(listaContometros)
    onClose()
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Detalle de Contómetros">
      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex gap-4 items-end flex-wrap">

            {/* Selector ISLA — primer orden */}
            <div className="w-44">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Isla Asignada {cargando && <span className="text-gray-400 font-normal">...</span>}
              </label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={islaSeleccionada}
                onChange={handleIslaChange}
                disabled={cargando}
              >
                <option value="">Seleccione...</option>
                {islas.map(isla => (
                  <option key={isla.id} value={isla.id}>
                    {isla.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Contómetro (filtrado por isla) */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Contómetro
              </label>
              <select
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                value={nuevo.contometroId}
                onChange={handleContometroChange}
                disabled={!islaSeleccionada || contometrosFiltrados.length === 0}
              >
                <option value="">
                  {!islaSeleccionada
                    ? '← Seleccione una isla'
                    : contometrosFiltrados.length === 0
                      ? 'Sin contómetros'
                      : 'Seleccione...'}
                </option>
                {contometrosFiltrados.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.producto}
                  </option>
                ))}
              </select>
            </div>

            {/* Lect. Actual */}
            <div className="w-28">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Lect. Actual</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 text-gray-600 text-center"
                readOnly
                value={nuevo.lecturaInicial}
              />
            </div>

            {/* Nueva Lectura */}
            <div className="w-28">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Nueva Lect.</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-center font-bold text-blue-600"
                placeholder="0.00"
                value={nuevo.lecturaFinal}
                onChange={e => handleInputChange('lecturaFinal', e.target.value)}
                disabled={!nuevo.contometroId}
              />
            </div>

            {/* P. Unit */}
            <div className="w-24">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">P. Unit</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 text-gray-600 text-center"
                readOnly
                value={nuevo.precio}
              />
            </div>

            {/* Monto calculado */}
            <div className="w-28">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase text-center">Monto</label>
              <input
                type="number"
                className="w-full h-10 border-gray-300 rounded-md bg-gray-100 font-bold text-gray-900 text-center"
                readOnly
                placeholder="0.00"
                value={nuevo.monto}
              />
            </div>

            {/* Botón Agregar */}
            <button
              onClick={agregarContometro}
              className="h-10 w-12 flex items-center justify-center bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              title="Agregar lectura"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Listado */}
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contómetro</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lect. Actual</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lect. Nueva</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Dif.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Final</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listaContometros.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {item.codigo}
                    <span className="ml-1 text-xs text-gray-400">({item.producto})</span>
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-500">{item.lecturaInicial}</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900 font-bold">{item.lecturaFinal}</td>
                  <td className="px-4 py-2 text-right text-sm text-blue-600 font-medium">{item.galones}</td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-green-600">S/ {item.monto}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => eliminarContometro(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {listaContometros.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay lecturas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar y Actualizar
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}
