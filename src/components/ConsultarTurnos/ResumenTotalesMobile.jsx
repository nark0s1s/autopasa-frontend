import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function ResumenTotalesMobile({ totales }) {
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  if (!totales) return null

  const items = [
    { label: 'Combustible', value: totales.totalCombustible, color: 'text-primary-600' },
    { label: 'Productos', value: totales.totalProductos, color: 'text-green-600' },
    { label: 'POS', value: totales.totalPOS, color: 'text-orange-600' },
    { label: 'Venta GNV', value: totales.totalVentaGnv, color: 'text-teal-700' },
    { label: 'Financ. GNV', value: totales.totalFinanciacionGnv, color: 'text-cyan-800' },
    { label: 'Guía crédito', value: totales.totalGuiaCredito, color: 'text-amber-700' },
    { label: 'Guía remisión', value: totales.totalGuiaRemision, color: 'text-yellow-800' },
    { label: 'Descuentos', value: totales.totalDescuentos, color: 'text-rose-600' },
    { label: 'Vales', value: totales.totalVales, color: 'text-red-600' },
    { label: 'Gastos', value: totales.totalGastos, color: 'text-gray-700' },
    { label: 'Depósitos', value: totales.totalDepositos, color: 'text-purple-600' },
    { label: 'Transferencias', value: totales.totalTransferencias, color: 'text-cyan-700' },
  ]

  return (
    <div className="mb-4 space-y-3">
      <div className="card p-4 border-2 border-primary-200 bg-primary-50/50">
        <p className="text-xs font-bold text-primary-900 uppercase tracking-wide mb-1">
          Efectivo esperado en caja
        </p>
        <p className="text-2xl font-bold text-primary-700 tabular-nums">
          S/ {totales.efectivoEsperado.toFixed(2)}
        </p>
        <button
          type="button"
          onClick={() => setDetalleAbierto((v) => !v)}
          className="mt-2 text-sm text-primary-700 inline-flex items-center gap-1 font-medium"
        >
          {detalleAbierto ? (
            <>
              Ocultar desglose
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Ver desglose
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
        {detalleAbierto && (
          <div className="mt-3 pt-3 border-t border-primary-200 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-700">Combustible + productos</span>
              <span className="font-semibold tabular-nums">S/ {totales.baseVentas.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-teal-800">
              <span>(+) Venta GNV</span>
              <span className="tabular-nums">S/ {totales.totalVentaGnv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-teal-800">
              <span>(+) Financ. GNV</span>
              <span className="tabular-nums">S/ {totales.totalFinanciacionGnv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-red-700">
              <span>(−) POS</span>
              <span className="tabular-nums">S/ {totales.totalPOS.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-red-700">
              <span>(−) Guía crédito</span>
              <span className="tabular-nums">S/ {totales.totalGuiaCredito.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-red-700">
              <span>(−) Guía remisión</span>
              <span className="tabular-nums">S/ {totales.totalGuiaRemision.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3 text-red-700">
              <span>(−) Desc. + vales + gastos + dep. + transf.</span>
              <span className="tabular-nums shrink-0">
                S/{' '}
                {(
                  totales.totalDescuentos +
                  totales.totalVales +
                  totales.totalGastos +
                  totales.totalDepositos +
                  totales.totalTransferencias
                ).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="card p-2.5">
            <p className="text-[10px] text-gray-600 leading-tight">{item.label}</p>
            <p className={`text-sm font-bold tabular-nums ${item.color}`}>S/ {item.value.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
