import { useState, useCallback } from 'react'

const DEFAULT_MS = 3000

/**
 * Toast breve success | error (mismo patrón que ConsultarTurnos).
 */
export function useEphemeralMessage(durationMs = DEFAULT_MS) {
  const [mensaje, setMensaje] = useState(null)

  const mostrarMensaje = useCallback(
    (texto, tipo = 'success') => {
      setMensaje({ texto, tipo })
      setTimeout(() => setMensaje(null), durationMs)
    },
    [durationMs]
  )

  return { mensaje, mostrarMensaje, setMensaje }
}
