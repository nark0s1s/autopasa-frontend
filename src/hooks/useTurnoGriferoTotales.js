import { useMemo } from 'react'

/**
 * Totales y comprobación de efectivo (misma fórmula que antes en ConsultarTurnos).
 */
export function useTurnoGriferoTotales(turno) {
  return useMemo(() => {
    if (!turno) return null

    const totalCombustible = parseFloat(turno.total_venta_combustible || 0)
    const totalProductos = parseFloat(turno.total_venta_productos || 0)
    const totalPOS = parseFloat(turno.total_ventas_pos || 0)
    const lineasGuiaCredito = turno.ventas_guia_credito ?? turno.ventas_credito ?? []
    const lineasGuiaRemision = turno.ventas_guia_remision ?? []
    const totalGuiaCredito = lineasGuiaCredito.reduce(
      (s, v) => s + parseFloat(v.monto || 0),
      0
    )
    const totalGuiaRemision = lineasGuiaRemision.reduce(
      (s, v) => s + parseFloat(v.monto || 0),
      0
    )
    const totalCredito =
      parseFloat(turno.total_ventas_credito || 0) ||
      totalGuiaCredito + totalGuiaRemision
    const totalDescuentos = parseFloat(turno.total_descuentos || 0)
    const totalVales = parseFloat(turno.total_vales || 0)
    const totalGastos = parseFloat(turno.total_gastos_autorizados || 0)
    const totalDepositos = parseFloat(turno.total_depositos_caja || 0)
    const efectivoEsperado = parseFloat(turno.efectivo_esperado || 0)
    const baseVentas = totalCombustible + totalProductos
    const efectivoCalculado =
      baseVentas -
      totalPOS -
      totalCredito -
      totalDescuentos -
      totalVales -
      totalGastos -
      totalDepositos

    return {
      totalCombustible,
      totalProductos,
      baseVentas,
      totalPOS,
      totalCredito,
      totalGuiaCredito,
      totalGuiaRemision,
      totalDescuentos,
      totalVales,
      totalGastos,
      totalDepositos,
      efectivoEsperado,
      efectivoCalculado,
      diferenciaFormula: Math.abs(efectivoCalculado - efectivoEsperado),
    }
  }, [turno])
}
