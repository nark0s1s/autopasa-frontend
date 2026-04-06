/**
 * Admin en UI: rol `admin` en /me o usuario comodín (mismo criterio que backend AUTOPASA_WILDCARD_USER).
 */
export function isAdminUser(user) {
  if (!user) return false
  if (user.rol?.nombre === 'admin') return true
  const w = (import.meta.env.VITE_WILDCARD_USER || 'flo').trim().toLowerCase()
  const u = (user.usuario || '').trim().toLowerCase()
  return u === w
}
