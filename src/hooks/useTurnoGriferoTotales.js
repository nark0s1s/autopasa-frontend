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
    const totalTransferencias = parseFloat(turno.total_transferencias_bancarias || 0)
    const ventasGnv = turno.ventas_gnv ?? []
    const finsGnv = turno.financiaciones_gnv ?? []
    const totalVentaGnv = ventasGnv.reduce((s, r) => s + parseFloat(r.venta_total_soles || 0), 0)
    const totalFinanciacionGnv = finsGnv.reduce((s, r) => s + parseFloat(r.monto_soles || 0), 0)
    const totalVentaGnvCab =
      parseFloat(turno.total_venta_gnv || 0) || totalVentaGnv
    const totalFinanciacionGnvCab =
      parseFloat(turno.total_financiacion_gnv || 0) || totalFinanciacionGnv
    const efectivoEsperado = parseFloat(turno.efectivo_esperado || 0)
    const baseVentas = totalCombustible + totalProductos
    const efectivoCalculado =
      baseVentas +
      totalVentaGnvCab +
      totalFinanciacionGnvCab -
      totalPOS -
      totalCredito -
      totalDescuentos -
      totalVales -
      totalGastos -
      totalDepositos -
      totalTransferencias

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
      totalTransferencias,
      totalVentaGnv: totalVentaGnvCab,
      totalFinanciacionGnv: totalFinanciacionGnvCab,
      efectivoEsperado,
      efectivoCalculado,
      diferenciaFormula: Math.abs(efectivoCalculado - efectivoEsperado),
    }
  }, [turno])
}
