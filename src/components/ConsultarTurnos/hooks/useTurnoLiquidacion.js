import { useState, useEffect, useCallback, useRef } from 'react'
import { getTurnoById, getContometrosParaTurnoGrifero } from '../../../utils/api'

/**
 * Carga turno de grifero + contómetros cuando `turnoId` está definido.
 * Si `turnoId` es null/undefined, limpia estado (vista lista).
 */
export function useTurnoLiquidacion(turnoId, options = {}) {
  const { onContometrosError, onTurnoError } = options
  const onContometrosErrorRef = useRef(onContometrosError)
  const onTurnoErrorRef = useRef(onTurnoError)
  onContometrosErrorRef.current = onContometrosError
  onTurnoErrorRef.current = onTurnoError

  const [turno, setTurno] = useState(null)
  const [contometros, setContometros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cargarContometros = useCallback(async (id) => {
    try {
      const data = await getContometrosParaTurnoGrifero(id)
      setContometros(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar contómetros del turno:', err)
      setContometros([])
      onContometrosErrorRef.current?.('No se pudieron cargar los contómetros del turno')
    }
  }, [])

  const cargarTurno = useCallback(
    async (id, { silent = false } = {}) => {
      if (!id) return
      try {
        if (!silent) {
          setLoading(true)
          setError(null)
        }
        const turnoData = await getTurnoById(id)
        setTurno(turnoData)
        await cargarContometros(id)
      } catch (err) {
        console.error('Error al cargar turno:', err)
        const msg = err?.message || 'Error al cargar turno'
        setError(msg)
        setTurno(null)
        setContometros([])
        onTurnoErrorRef.current?.()
        throw err
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [cargarContometros]
  )

  const recargar = useCallback(() => {
    if (turnoId) return cargarTurno(turnoId, { silent: true })
    return Promise.resolve()
  }, [turnoId, cargarTurno])

  useEffect(() => {
    if (!turnoId) {
      setTurno(null)
      setContometros([])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const turnoData = await getTurnoById(turnoId)
        if (cancelled) return
        setTurno(turnoData)
        try {
          const data = await getContometrosParaTurnoGrifero(turnoId)
          if (cancelled) return
          setContometros(Array.isArray(data) ? data : [])
        } catch (err) {
          if (cancelled) return
          console.error('Error al cargar contómetros del turno:', err)
          setContometros([])
          onContometrosErrorRef.current?.('No se pudieron cargar los contómetros del turno')
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error al cargar turno:', err)
        setError(err?.message || 'Error al cargar turno')
        setTurno(null)
        setContometros([])
        onTurnoErrorRef.current?.()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [turnoId])

  return {
    turno,
    setTurno,
    contometros,
    setContometros,
    loading,
    error,
    cargarTurno,
    recargar,
    cargarContometros,
  }
}
