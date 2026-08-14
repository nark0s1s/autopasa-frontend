import { useEffect, useState } from 'react'
import { fetchCreditoPersonaFirmaBlobUrl } from '../utils/api'

/**
 * Carga la firma con token (img src no envía Authorization).
 */
export default function CreditoFirmaImage({ personaId, alt = 'Firma', className = '', onError }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoke = null
    let cancelled = false
    setSrc(null)
    setFailed(false)
    if (!personaId) return undefined
    fetchCreditoPersonaFirmaBlobUrl(personaId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        revoke = url
        setSrc(url)
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          onError?.()
        }
      })
    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [personaId, onError])

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-500 text-sm ${className}`}>
        Sin imagen
      </div>
    )
  }
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-400 text-sm animate-pulse ${className}`}>
        Cargando firma…
      </div>
    )
  }
  return <img src={src} alt={alt} className={`object-contain bg-white ${className}`} />
}
