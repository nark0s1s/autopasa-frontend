import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useEphemeralMessage } from '../../hooks/useEphemeralMessage'
import { useTurnoLiquidacion } from './hooks/useTurnoLiquidacion'
import { useTurnosGriferoCatalogos } from '../../hooks/useTurnosGriferoCatalogos'
import { useTurnoGriferoTotales } from '../../hooks/useTurnoGriferoTotales'
import { eliminarTurnoGriferoCerrado } from '../../utils/api'
import { TurnoLista } from './TurnoLista'
import { TurnoDetalle } from './TurnoDetalle'

export default function ConsultarTurnos() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { mensaje, mostrarMensaje } = useEphemeralMessage()

  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [tabActiva, setTabActiva] = useState('lecturas')
  const [vistaActual, setVistaActual] = useState('lista')

  const turnoLiquidacionId = vistaActual === 'detalle' ? turnoSeleccionado : null

  const {
    turno,
    contometros,
    cargarTurno,
    loading: loadingTurno,
  } = useTurnoLiquidacion(turnoLiquidacionId, {
    onContometrosError: (msg) => mostrarMensaje(msg, 'error'),
    onTurnoError: () => mostrarMensaje('Error al cargar turno', 'error'),
  })

  const {
    turnos,
    productos,
    tiposVale,
    loading: loadingLista,
    setLoading: setLoadingLista,
    cargarListaYCatalogos,
    recargarSoloTurnos,
  } = useTurnosGriferoCatalogos()

  const [loadingInicial, setLoadingInicial] = useState(true)
  const [showModalCierre, setShowModalCierre] = useState(false)
  const [turnoEliminarCerrado, setTurnoEliminarCerrado] = useState(null)
  const [textoConfirmarEliminarCerrado, setTextoConfirmarEliminarCerrado] = useState('')
  const [eliminandoTurnoCerrado, setEliminandoTurnoCerrado] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoadingInicial(true)
        await cargarListaYCatalogos()
        if (cancelled) return
        const tid = searchParams.get('turno')
        if (tid) {
          const nid = Number(tid)
          if (!Number.isNaN(nid)) {
            setTurnoSeleccionado(nid)
            setVistaActual('detalle')
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error al cargar datos:', error)
          mostrarMensaje('Error al cargar datos', 'error')
        }
      } finally {
        if (!cancelled) setLoadingInicial(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cargarListaYCatalogos, mostrarMensaje, searchParams])

  const pageLoading = useMemo(
    () =>
      loadingInicial ||
      (Boolean(turnoLiquidacionId) && loadingTurno) ||
      (vistaActual === 'lista' && loadingLista),
    [loadingInicial, turnoLiquidacionId, loadingTurno, vistaActual, loadingLista]
  )

  const cargarDetalleTurno = (id) => {
    setTurnoSeleccionado(id)
    setVistaActual('detalle')
    setSearchParams({ turno: String(id) }, { replace: true })
  }

  const volverALista = async () => {
    setVistaActual('lista')
    setTurnoSeleccionado(null)
    setSearchParams({}, { replace: true })
    try {
      setLoadingLista(true)
      await cargarListaYCatalogos()
    } catch (error) {
      console.error('Error al cargar datos:', error)
      mostrarMensaje('Error al cargar datos', 'error')
    } finally {
      setLoadingLista(false)
    }
  }

  const recargarDatosLiquidacion = async () => {
    const idDetalle = turnoSeleccionado
    try {
      await recargarSoloTurnos()
      if (idDetalle) {
        await cargarTurno(idDetalle, { silent: true })
      }
    } catch (error) {
      console.error('Error al recargar:', error)
      mostrarMensaje('Error al recargar datos', 'error')
    }
  }

  const ejecutarEliminarTurnoCerrado = async () => {
    if (!turnoEliminarCerrado?.id) return
    if (textoConfirmarEliminarCerrado.trim() !== 'CONFIRMAR') {
      mostrarMensaje('Debe escribir exactamente CONFIRMAR', 'error')
      return
    }
    const idEliminado = turnoEliminarCerrado.id
    setEliminandoTurnoCerrado(true)
    try {
      await eliminarTurnoGriferoCerrado(idEliminado, 'CONFIRMAR')
      mostrarMensaje('Turno cerrado eliminado correctamente')
      setTurnoEliminarCerrado(null)
      setTextoConfirmarEliminarCerrado('')
      const estabaEnDetalle = turnoSeleccionado === idEliminado || turno?.id === idEliminado
      if (estabaEnDetalle) {
        setTurnoSeleccionado(null)
        setVistaActual('lista')
        setSearchParams({}, { replace: true })
      }
      setLoadingLista(true)
      try {
        await recargarSoloTurnos()
      } finally {
        setLoadingLista(false)
      }
    } catch (error) {
      console.error(error)
      mostrarMensaje('No se pudo eliminar el turno (¿permiso turno.cerrar?)', 'error')
    } finally {
      setEliminandoTurnoCerrado(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const totales = useTurnoGriferoTotales(turno)

  const openEliminarCerrado = (t) => {
    setTurnoEliminarCerrado(t)
    setTextoConfirmarEliminarCerrado('')
  }

  const cancelEliminarCerrado = () => {
    setTurnoEliminarCerrado(null)
    setTextoConfirmarEliminarCerrado('')
  }

  const handleCierreSuccess = (cerrado) => {
    setShowModalCierre(false)
    volverALista()
    const avisos = cerrado?.avisos_stock_combustible
    const extra =
      Array.isArray(avisos) && avisos.length
        ? `\n\nAvisos de inventario:\n${avisos.join('\n')}`
        : ''
    mostrarMensaje(`Turno cerrado correctamente.${extra}`)
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f3e0' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (vistaActual === 'lista') {
    return (
      <TurnoLista
        user={user}
        turnos={turnos}
        mensaje={mensaje}
        onLogout={handleLogout}
        onSelectTurno={cargarDetalleTurno}
        onOpenEliminarCerrado={openEliminarCerrado}
        turnoEliminarCerrado={turnoEliminarCerrado}
        textoConfirmarEliminarCerrado={textoConfirmarEliminarCerrado}
        onTextoConfirmarEliminarCerrado={setTextoConfirmarEliminarCerrado}
        eliminandoTurnoCerrado={eliminandoTurnoCerrado}
        onCancelEliminarCerrado={cancelEliminarCerrado}
        onConfirmEliminarCerrado={ejecutarEliminarTurnoCerrado}
      />
    )
  }

  if (!turno) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f5f3e0' }}>
        <div className="card p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" aria-hidden />
          <p className="text-gray-800 mb-4">No se pudo cargar este turno o ya no existe.</p>
          <button type="button" className="btn btn-primary" onClick={volverALista}>
            Volver a la lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <TurnoDetalle
      turno={turno}
      mensaje={mensaje}
      totales={totales}
      contometros={contometros}
      productos={productos}
      tiposVale={tiposVale}
      tabActiva={tabActiva}
      setTabActiva={setTabActiva}
      showModalCierre={showModalCierre}
      setShowModalCierre={setShowModalCierre}
      onVolver={volverALista}
      onLogout={handleLogout}
      onMensaje={mostrarMensaje}
      onReload={recargarDatosLiquidacion}
      onOpenEliminarCerrado={openEliminarCerrado}
      turnoEliminarCerrado={turnoEliminarCerrado}
      textoConfirmarEliminarCerrado={textoConfirmarEliminarCerrado}
      onTextoConfirmarEliminarCerrado={setTextoConfirmarEliminarCerrado}
      eliminandoTurnoCerrado={eliminandoTurnoCerrado}
      onCancelEliminarCerrado={cancelEliminarCerrado}
      onConfirmEliminarCerrado={ejecutarEliminarTurnoCerrado}
      onCierreSuccess={handleCierreSuccess}
    />
  )
}
