import { useState, useEffect } from 'react'
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
  const [turnoConfigIdModal, setTurnoConfigIdModal] = useState('')
  const [fechaTurnoModal, setFechaTurnoModal] = useState(fechaOperativaHoy)
  const [turnoAEliminar, setTurnoAEliminar] = useState(null)
  const [eliminandoTurno, setEliminandoTurno] = useState(false)

  const cargarDatos = async () => {
    try {
      setLoading(true)

      try {
        const turnoData = await getTurnoGriferoActual()
        setTurnoActual(turnoData ?? null)
      } catch {
        setTurnoActual(null)
      }

      const esAdminOSupervisor =
        user?.rol?.nombre === 'admin' || user?.rol?.nombre === 'supervisor'
      const [turnosData, cfgs] = await Promise.all([
        listarTurnosGrifero(esAdminOSupervisor ? {} : { empleado_id: user.id }),
        listarTurnosConfigInfra({ activo: true }),
      ])
      setTurnos(turnosData)
      setTurnosConfig(Array.isArray(cfgs) ? cfgs : [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos: ' + (error.response?.data?.detail || error.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo })
    const duracion = tipo === 'error' ? 5000 : 3000
    setTimeout(() => setMensaje(null), duracion)
  }

  const abrirModalNuevoTurno = () => {
    const first = turnosConfig[0]
    setTurnoConfigIdModal(first ? String(first.id) : '')
    setFechaTurnoModal(fechaOperativaHoy())
    setMostrarModal(true)
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
      mostrarMensaje('Turno iniciado correctamente')

      await cargarDatos()
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
      await cargarDatos()
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
