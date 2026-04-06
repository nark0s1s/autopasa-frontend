import { Navigate, useParams } from 'react-router-dom'

/**
 * La liquidación operativa (lecturas, ventas, POS, vales, cierre) vive en
 * ConsultarTurnos. Esta ruta conserva enlaces antiguos /liquidacion/:id.
 */
export default function DetalleTurno() {
  const { id } = useParams()
  if (!id) {
    return <Navigate to="/liquidacion" replace />
  }
  return <Navigate to={`/consultar-turnos?turno=${encodeURIComponent(id)}`} replace />
}
