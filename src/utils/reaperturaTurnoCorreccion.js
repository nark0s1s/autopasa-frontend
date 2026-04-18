/**
 * Quién puede ver el panel de reapertura / corrección de cuadre en consultar-turnos.
 * @param {string[] | null} permisosApi - null = aún no cargado desde /api/auth/me/permissions
 * @param {object} user - empleado con rol opcional
 * @returns {boolean | null} null si permisos no cargados; false sin acceso; true con acceso
 */
export function puedeVerPanelReaperturaCorreccion(permisosApi, user) {
  if (permisosApi == null) return null
  const r = (user?.rol?.nombre || '').toLowerCase()
  if (r === 'admin' || r === 'supervisor') return true
  return permisosApi.includes('turno.cerrar') || permisosApi.includes('conciliacion_stock.editar')
}
