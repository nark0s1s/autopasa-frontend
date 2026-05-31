import { turnoGriferoEsAbierto, turnoGriferoEsCerrado, turnoGriferoEsAuditado } from '../../utils/turnoGriferoEstado'

export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50]
export const DEFAULT_PAGE_SIZE = 15

export function getEstadoLabel(t) {
  return (
    (t.estado_nombre && String(t.estado_nombre).trim()) ||
    (turnoGriferoEsAbierto(t) ? 'Abierto' : turnoGriferoEsCerrado(t) ? 'Cerrado' : turnoGriferoEsAuditado(t) ? 'Auditado' : '—')
  )
}

export function getEstadoColor(t) {
  if (turnoGriferoEsAbierto(t)) return 'bg-green-100 text-green-800'
  if (turnoGriferoEsCerrado(t)) return 'bg-red-100 text-red-800'
  if (turnoGriferoEsAuditado(t)) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-800'
}

export function montoDiferencia(t) {
  const v = t?.diferencia
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function nombreGrifero(t) {
  const flat = t.empleado_nombre?.trim()
  if (flat) return flat
  const nested = [t.empleado?.nombres, t.empleado?.apellidos].filter(Boolean).join(' ').trim()
  return nested || '—'
}

export function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…')
    result.push(sorted[i])
  }
  return result
}

function fechaTurnoTimestamp(t) {
  const v = t?.fecha_turno
  if (!v) return 0
  const s = typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10)
  const ms = new Date(`${s}T12:00:00`).getTime()
  return Number.isFinite(ms) ? ms : 0
}

export function nombreTipoTurno(t) {
  const et = t.turno_config_etiqueta?.trim()
  if (!et) return '—'
  const sep = ' - '
  const i = et.indexOf(sep)
  return i === -1 ? et : et.slice(0, i)
}

export function ordenarTurnosPorFechaDesc(lista) {
  return [...lista].sort((a, b) => {
    const diffFecha = fechaTurnoTimestamp(b) - fechaTurnoTimestamp(a)
    if (diffFecha !== 0) return diffFecha
    return (b.id || 0) - (a.id || 0)
  })
}
