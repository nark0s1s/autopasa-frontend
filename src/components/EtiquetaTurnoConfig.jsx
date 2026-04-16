/**
 * Muestra `turno_config.nombre` (mayúsculas) y fecha de liquidación DD/MM/AAAA separados por " - "
 * tal como devuelve la API en `turno_config_etiqueta`.
 */
export default function EtiquetaTurnoConfig({ texto, className = '' }) {
  if (!texto || !String(texto).trim()) {
    return <span className={`text-gray-400 ${className}`.trim()}>—</span>
  }
  const s = String(texto).trim()
  const sep = ' - '
  const i = s.indexOf(sep)
  if (i === -1) {
    return (
      <span className={`font-semibold text-primary-800 tracking-wide ${className}`.trim()}>
        {s}
      </span>
    )
  }
  const nombre = s.slice(0, i)
  const fecha = s.slice(i + sep.length)
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`.trim()}>
      <span className="font-semibold text-primary-800 tracking-wide">{nombre}</span>
      <span className="text-gray-400 font-light">-</span>
      <span className="text-gray-700 tabular-nums text-sm">{fecha}</span>
    </span>
  )
}
