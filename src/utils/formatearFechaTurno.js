export function formatearFechaTurno(valor) {
  if (!valor) return '—'
  const s = typeof valor === 'string' ? valor.slice(0, 10) : String(valor).slice(0, 10)
  try {
    return new Date(`${s}T12:00:00`).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}
