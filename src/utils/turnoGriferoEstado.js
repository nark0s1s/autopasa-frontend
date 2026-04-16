/**
 * Estados de turno cabecera grifero vienen de `proceso_estado` (ids no fijos).
 * La API puede enviar `estado_codigo` / `estado_nombre`; si no, se usa respaldo por id legacy.
 */

export function turnoGriferoEsAbierto(turno) {
  if (!turno) return false
  const c = String(turno.estado_codigo || '').toLowerCase().trim()
  if (c === 'abierto') return true
  if (c === 'cerrado' || c === 'auditado') return false
  return turno.estado_id === 1
}

export function turnoGriferoEsCerrado(turno) {
  if (!turno) return false
  const c = String(turno.estado_codigo || '').toLowerCase().trim()
  if (c === 'cerrado') return true
  if (c === 'abierto' || c === 'auditado') return false
  return turno.estado_id === 2
}

export function turnoGriferoEsAuditado(turno) {
  if (!turno) return false
  const c = String(turno.estado_codigo || '').toLowerCase().trim()
  if (c === 'auditado') return true
  return turno.estado_id === 3
}
