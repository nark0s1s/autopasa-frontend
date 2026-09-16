import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getTurnoGriferoActual,
  crearTurnoGrifero,
  getTurnoDiaActual,
  crearTurnoDia,
  listarTurnosGrifero,
  listarTurnosConfigInfra,
  eliminarTurnoGriferoAbierto,
} from '../utils/api'
import { fechaOperativaHoy } from '../pages/liquidacionGriferoUtils'

/** Historial reciente en Mis Turnos (más recientes primero; evita listado ilimitado). */
const LIMIT_HISTORIAL = 80

export function useLiquidacionGrifero() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [turnos, setTurnos] = useState([])
  const [turnoActual, setTurnoActual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [iniciandoTurno, setIniciandoTurno] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [turnosConfig, setTurnosConfig] = useState([])
  const [cargandoConfigs, setCargandoConfigs] = useState(false)
  const [turnoConfigIdModal, setTurnoConfigIdModal] = useState('')
  const [fechaTurnoModal, setFechaTurnoModal] = useState(fechaOperativaHoy)
  const [turnoAEliminar, setTurnoAEliminar] = useState(null)
  const [eliminandoTurno, setEliminandoTurno] = useState(false)

  const configsCargadosRef = useRef(false)
  const cargandoConfigsRef = useRef(false)
  const turnosConfigCacheRef = useRef([])

  const paramsListaHistorial = useCallback(() => {
    const esAdminOSupervisor =
      user?.rol?.nombre === 'admin' || user?.rol?.nombre === 'supervisor'
    return {
      ...(esAdminOSupervisor ? {} : { empleado_id: user.id }),
      limit: LIMIT_HISTORIAL,
    }
  }, [user])

  const asegurarTurnosConfig = useCallback(async () => {
    if (configsCargadosRef.current) {
      return turnosConfigCacheRef.current
    }
    while (cargandoConfigsRef.current) {
      await new Promise((r) => setTimeout(r, 40))
      if (configsCargadosRef.current) {
        return turnosConfigCacheRef.current
      }
    }
    cargandoConfigsRef.current = true
    setCargandoConfigs(true)
    try {
      const cfgs = await listarTurnosConfigInfra({
        activo: true,
        include_islas: false,
      })
      const list = Array.isArray(cfgs) ? cfgs : []
      turnosConfigCacheRef.current = list
      setTurnosConfig(list)
      configsCargadosRef.current = true
      return list
    } catch (error) {
      console.error('Error al cargar tipos de turno:', error)
      throw error
    } finally {
      cargandoConfigsRef.current = false
      setCargandoConfigs(false)
    }
  }, [])

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    const duracion = tipo === 'error' ? 5000 : 3000
    setTimeout(() => setMensaje(null), duracion)
  }

  const cargarDatos = async ({ fullPage = true } = {}) => {
    try {
      if (fullPage) setLoading(true)

      const [turnoData, turnosData] = await Promise.all([
        getTurnoGriferoActual().catch(() => null),
        listarTurnosGrifero(paramsListaHistorial()),
      ])
      setTurnoActual(turnoData ?? null)
      setTurnos(Array.isArray(turnosData) ? turnosData : [])

      // Catálogo solo para «Nuevo turno»: no bloquea el paint inicial
      void asegurarTurnosConfig().catch(() => {})
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      if (fullPage) setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrirModalNuevoTurno = async () => {
    setFechaTurnoModal(fechaOperativaHoy())
    setTurnoConfigIdModal('')
    setMostrarModal(true)
    try {
      const list = await asegurarTurnosConfig()
      const first = list?.[0]
      setTurnoConfigIdModal(first ? String(first.id) : '')
    } catch {
      mostrarMensaje('No se pudieron cargar los tipos de turno', 'error')
    }
  }

  const handleIniciarTurno = async () => {
    const cfgId = Number(turnoConfigIdModal)
    if (!cfgId) {
      mostrarMensaje('Seleccione el tipo de turno (liquidación del día)', 'error')
      return
    }
    if (!fechaTurnoModal) {
      mostrarMensaje('Seleccione la fecha del turno', 'error')
      return
    }
    try {
      setIniciandoTurno(true)

      const fechaLiquidacion = fechaTurnoModal
      let turnoDia = await getTurnoDiaActual(cfgId, fechaLiquidacion)

      if (!turnoDia?.id) {
        try {
          turnoDia = await crearTurnoDia({
            fecha: fechaLiquidacion,
            turno_config_id: cfgId,
          })
          mostrarMensaje('Liquidación del día creada para el turno seleccionado', 'success')
        } catch (createError) {
          const det = createError.response?.data?.detail
          const msg =
            typeof det === 'string'
              ? det
              : Array.isArray(det)
                ? JSON.stringify(det)
                : ''
          if (msg.includes('Ya existe')) {
            turnoDia = await getTurnoDiaActual(cfgId, fechaLiquidacion)
          } else {
            throw new Error(
              'No se pudo crear la liquidación del día: ' + (msg || createError.message)
            )
          }
        }
      }

      if (!turnoDia?.id) {
        throw new Error('No se pudo obtener o crear la liquidación del día para este tipo de turno')
      }

      const nuevoTurno = await crearTurnoGrifero({
        turno_liquidacion_id: turnoDia.id,
        fecha_turno: fechaLiquidacion,
        observaciones_apertura: 'Turno iniciado desde el sistema',
      })

      setTurnoActual(nuevoTurno)
      setMostrarModal(false)
      // Navega al cuadre sin re-cargar toda la página (era trabajo desperdiciado)
      navigate(`/consultar-turnos?turno=${nuevoTurno.id}`)
    } catch (error) {
      console.error('Error al iniciar turno:', error)
      mostrarMensaje(
        'Error al iniciar turno: ' + (error.message || error.response?.data?.detail || 'Error desconocido'),
        'error'
      )
    } finally {
      setIniciandoTurno(false)
    }
  }

  const handleConfirmarEliminarTurno = async () => {
    if (!turnoAEliminar?.id) return
    const idEliminado = turnoAEliminar.id
    try {
      setEliminandoTurno(true)
      await eliminarTurnoGriferoAbierto(idEliminado)
      mostrarMensaje('Turno eliminado correctamente')
      setTurnoAEliminar(null)
      if (turnoActual?.id === idEliminado) {
        setTurnoActual(null)
      }
      // Solo list + actual (sin catálogo ni full-page spinner)
      await cargarDatos({ fullPage: false })
    } catch (error) {
      const det = error.response?.data?.detail
      const msg =
        typeof det === 'string'
          ? det
          : Array.isArray(det)
            ? det.map((e) => e.msg).join(' ')
            : error.message
      mostrarMensaje(msg || 'No se pudo eliminar el turno', 'error')
    } finally {
      setEliminandoTurno(false)
    }
  }

  const irAlTurno = (turnoId) => navigate(`/consultar-turnos?turno=${turnoId}`)

  return {
    user,
    turnos,
    turnoActual,
    loading,
    mensaje,
    iniciandoTurno,
    mostrarModal,
    setMostrarModal,
    turnosConfig,
    cargandoConfigs,
    turnoConfigIdModal,
    setTurnoConfigIdModal,
    fechaTurnoModal,
    setFechaTurnoModal,
    turnoAEliminar,
    setTurnoAEliminar,
    eliminandoTurno,
    abrirModalNuevoTurno,
    handleIniciarTurno,
    handleConfirmarEliminarTurno,
    irAlTurno,
  }
}
