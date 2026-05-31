import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function getEstadoColor(turno) {
  const c = String(turno?.estado_codigo || '').toLowerCase()
  if (c === 'abierto') return 'bg-green-100 text-green-800'
  if (c === 'cerrado') return 'bg-red-100 text-red-800'
  if (c === 'auditado') return 'bg-blue-100 text-blue-800'
  switch (turno?.estado_id) {
    case 1:
      return 'bg-green-100 text-green-800'
    case 2:
      return 'bg-red-100 text-red-800'
    case 3:
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function esTurnoCerrado(turno) {
  return String(turno?.estado_codigo || '').toLowerCase() === 'cerrado' || turno?.estado_id === 2
}

export function montoDiferencia(turno) {
  const v = turno?.diferencia
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function getEstadoTexto(turno) {
  const nom = turno?.estado_nombre?.trim()
  if (nom) return nom
  const c = String(turno?.estado_codigo || '').toLowerCase()
  if (c === 'abierto') return 'Abierto'
  if (c === 'cerrado') return 'Cerrado'
  if (c === 'auditado') return 'Auditado'
  switch (turno?.estado_id) {
    case 1:
      return 'Abierto'
    case 2:
      return 'Cerrado'
    case 3:
      return 'Auditado'
    default:
      return 'Desconocido'
  }
}

export function formatearFecha(fecha) {
  return format(new Date(fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })
}

export function formatearSoloFecha(valor) {
  if (!valor) return '—'
  const s = typeof valor === 'string' ? valor.slice(0, 10) : String(valor).slice(0, 10)
  return format(new Date(`${s}T12:00:00`), "d 'de' MMMM yyyy", { locale: es })
}

export function fechaOperativaHoy() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().split('T')[0]
}
