export function ResumenTotales({ totales }) {
  if (!totales) return null
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Combustible</p>
          <p className="text-lg font-bold text-primary-600">S/ {totales.totalCombustible.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Productos</p>
          <p className="text-lg font-bold text-green-600">S/ {totales.totalProductos.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">POS</p>
          <p className="text-lg font-bold text-orange-600">S/ {totales.totalPOS.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Guía crédito</p>
          <p className="text-lg font-bold text-amber-700">S/ {totales.totalGuiaCredito.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Guía remisión</p>
          <p className="text-lg font-bold text-yellow-800">S/ {totales.totalGuiaRemision.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Descuentos</p>
          <p className="text-lg font-bold text-rose-600">S/ {totales.totalDescuentos.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Vales</p>
          <p className="text-lg font-bold text-red-600">S/ {totales.totalVales.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Gastos</p>
          <p className="text-lg font-bold text-gray-700">S/ {totales.totalGastos.toFixed(2)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600 mb-1">Depósitos</p>
          <p className="text-lg font-bold text-purple-600">S/ {totales.totalDepositos.toFixed(2)}</p>
        </div>
      </div>

      <div className="card p-5 mb-6 border-2 border-primary-200 bg-primary-50/40">
        <h3 className="text-sm font-bold text-primary-900 uppercase tracking-wide mb-3">
          Totalizador — efectivo esperado en caja
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Combustible + productos (venta registrada) menos lo que no queda como efectivo en caja (POS, guías
          crédito/remisión, descuentos, vales, gastos, depósitos en caja).
        </p>
        <div className="space-y-1.5 text-sm max-w-lg">
          <div className="flex justify-between gap-4">
            <span className="text-gray-700">Venta combustible + productos</span>
            <span className="font-semibold tabular-nums">S/ {totales.baseVentas.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 text-red-700">
            <span>(−) Ventas POS (tarjeta)</span>
            <span className="font-semibold tabular-nums">S/ {totales.totalPOS.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 text-red-700">
            <span>(−) Guías crédito + remisión</span>
            <span className="font-semibold tabular-nums">S/ {totales.totalCredito.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 text-red-700">
            <span>(−) Descuentos aplicados</span>
            <span className="font-semibold tabular-nums">S/ {totales.totalDescuentos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 text-red-700">
            <span>(−) Vales</span>
            <span className="font-semibold tabular-nums">S/ {totales.totalVales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 text-red-700">
            <span>(−) Gastos autorizados</span>
            <span className="font-semibold tabular-nums">S/ {totales.totalGastos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4 text-red-700">
            <span>(−) Depósitos en caja</span>
            <span className="font-semibold tabular-nums">S/ {totales.totalDepositos.toFixed(2)}</span>
          </div>
          <div className="border-t border-primary-200 pt-2 mt-2 flex justify-between gap-4 text-base font-bold text-primary-900">
            <span>= Efectivo esperado</span>
            <span className="tabular-nums">S/ {totales.efectivoEsperado.toFixed(2)}</span>
          </div>
          {totales.diferenciaFormula >= 0.02 && (
            <p className="text-xs text-amber-800 pt-1">
              Comprobación manual: S/ {totales.efectivoCalculado.toFixed(2)} (diferencia redondeo o datos
              desactualizados; recargue el turno).
            </p>
          )}
        </div>
      </div>
    </>
  )
}
