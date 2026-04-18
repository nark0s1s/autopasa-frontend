import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Unlock, RefreshCw } from 'lucide-react'
import {
  getContextoReaperturaCorreccionTurnoGrifero,
  reabrirConciliacionStockCerrada,
  reabrirConsolidacionLiquidacionCerrada,
  reabrirTurnoGriferoParaCorreccion,
} from '../../utils/api'
import { turnoGriferoEsCerrado } from '../../utils/turnoGriferoEstado'
import { puedeVerPanelReaperturaCorreccion } from '../../utils/reaperturaTurnoCorreccion'

/**
 * Flujo guiado: conciliación stock (si cerrada) → consolidación liquidación (si cerrada) → reabrir turno.
 * Requiere permisos de API según cada acción (conciliacion_stock.editar, turno.cerrar).
 */
export function PanelReaperturaCorreccion({ turno, user, permisosApi, onMensaje, onReload }) {
  const [ctx, setCtx] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accion, setAccion] = useState(null)

  const acceso = puedeVerPanelReaperturaCorreccion(permisosApi, user)
  const puedeStock = Array.isArray(permisosApi) && permisosApi.includes('conciliacion_stock.editar')
  const puedeConsolidacionYTurno = Array.isArray(permisosApi) && permisosApi.includes('turno.cerrar')

  const cargar = useCallback(async () => {
    if (!turno?.id || !turnoGriferoEsCerrado(turno)) {
      setCtx(null)
      return
    }
    try {
      setLoading(true)
      const data = await getContextoReaperturaCorreccionTurnoGrifero(turno.id)
      setCtx(data)
    } catch {
      setCtx(null)
    } finally {
      setLoading(false)
    }
  }, [turno?.id, turno])

  useEffect(() => {
    if (acceso !== true) {
      setCtx(null)
      return
    }
    cargar()
  }, [acceso, cargar])

  if (!turnoGriferoEsCerrado(turno)) {
    return null
  }

  if (acceso === null) {
    return (
      <div className="card mb-6 p-4 text-sm text-gray-600 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden />
        Comprobando permisos…
      </div>
    )
  }

  if (acceso === false) {
    return null
  }

  if (loading && !ctx) {
    return (
      <div className="card mb-6 p-4 text-sm text-gray-600 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" aria-hidden />
        Comprobando consolidación…
      </div>
    )
  }

  if (!ctx) {
    return (
      <div className="card mb-6 p-4 border border-amber-200 bg-amber-50/80 text-sm text-amber-950">
        <p className="mb-2">No se pudo obtener el contexto de reapertura.</p>
        <button type="button" className="btn btn-outline text-sm" onClick={() => cargar()}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!ctx.incluido_en_consolidacion_liquidacion) {
    return (
      <div className="card mb-6 p-5 border border-gray-200 bg-gray-50/90">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Reapertura por corrección de cuadre</h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          Este turno <strong>no está incluido</strong> en una consolidación de liquidación. La reapertura para editar
          el cuadre con reglas de consolidado solo aplica cuando el turno ya figura en una consolidación y esa
          consolidación puede dejarse en <strong>pendiente</strong> (reabriendo antes conciliación de stock si hace
          falta).
        </p>
        <p className="text-xs text-gray-600 mb-3">
          Si solo necesita anular un cierre sin consolidar, evalúe las opciones operativas que correspondan según
          política interna.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/turno-consolidacion-liquidacion" className="btn btn-secondary text-sm">
            Ir a consolidación y liquidación
          </Link>
          <Link to="/supervision/conciliacion-stock-combustible" className="btn btn-outline text-sm">
            Ir a conciliación stock combustible
          </Link>
        </div>
      </div>
    )
  }

  const run = async (fn, label) => {
    try {
      setAccion(label)
      await fn()
      onMensaje(label + ' — OK', 'success')
      await cargar()
      await onReload?.()
    } catch (e) {
      const d = e.response?.data?.detail
      const msg = typeof d === 'string' ? d : e.message || 'Error'
      onMensaje(msg, 'error')
    } finally {
      setAccion(null)
    }
  }

  const stockCerrado = ctx.conciliacion_stock_estado === 'cerrada'
  const consCerrada = ctx.consolidacion_liquidacion_estado === 'cerrada'
  const consId = ctx.consolidacion_liquidacion_id
  const concId = ctx.conciliacion_stock_combustible_id

  return (
    <div className="card mb-6 p-5 border border-amber-200 bg-amber-50/80">
      <div className="flex items-start gap-3">
        <Unlock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-950 mb-1">Corrección con turno consolidado</h3>
          <p className="text-xs text-amber-900/90 mb-3">
            Consolidación{' '}
            <span className="font-mono">{ctx.consolidacion_liquidacion_codigo || consId}</span> (
            {ctx.consolidacion_liquidacion_estado || '—'})
            {ctx.conciliacion_stock_combustible_id != null && (
              <>
                {' '}
                · Conciliación stock #{ctx.conciliacion_stock_combustible_id} ({ctx.conciliacion_stock_estado || '—'})
              </>
            )}
          </p>
          <p className="text-xs text-gray-800 mb-3 leading-relaxed">
            La <strong>consolidación de liquidación debe estar en pendiente</strong> antes de reabrir el turno. Si la
            conciliación de stock está <strong>cerrada</strong>, ábrala primero (borrador). Al confirmar la reapertura
            del turno, el servidor <strong>recalcula totales</strong> de la consolidación pendiente y actualiza{' '}
            <strong>galones de ventas</strong> en la conciliación de stock en borrador.
          </p>
          {ctx.pasos_sugeridos?.length > 0 && (
            <ol className="text-xs text-gray-800 list-decimal pl-4 space-y-1 mb-4">
              {ctx.pasos_sugeridos.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            {stockCerrado && concId != null && (
              <button
                type="button"
                className="btn btn-secondary text-sm"
                disabled={Boolean(accion) || !puedeStock}
                title={!puedeStock ? 'Requiere permiso conciliacion_stock.editar' : undefined}
                onClick={() => run(() => reabrirConciliacionStockCerrada(concId), 'Conciliación stock reabierta')}
              >
                {accion === 'Conciliación stock reabierta' ? '…' : '1. Reabrir conciliación stock'}
              </button>
            )}
            {consCerrada && consId != null && (
              <button
                type="button"
                className="btn btn-secondary text-sm"
                disabled={Boolean(accion) || stockCerrado || !puedeConsolidacionYTurno}
                title={
                  !puedeConsolidacionYTurno
                    ? 'Requiere permiso turno.cerrar'
                    : stockCerrado
                      ? 'Primero reabra la conciliación de stock cerrada'
                      : undefined
                }
                onClick={() =>
                  run(
                    () => reabrirConsolidacionLiquidacionCerrada(consId),
                    'Consolidación de liquidación reabierta'
                  )
                }
              >
                {accion === 'Consolidación de liquidación reabierta' ? '…' : '2. Reabrir consolidación liquidación'}
              </button>
            )}
            {ctx.puede_reabrir_turno_aqui && (
              <button
                type="button"
                className="btn btn-primary text-sm"
                disabled={Boolean(accion) || !puedeConsolidacionYTurno}
                title={!puedeConsolidacionYTurno ? 'Requiere permiso turno.cerrar' : undefined}
                onClick={() => run(() => reabrirTurnoGriferoParaCorreccion(turno.id), 'Turno reabierto para corrección')}
              >
                {accion === 'Turno reabierto para corrección' ? '…' : '3. Reabrir turno para editar cuadre'}
              </button>
            )}
            <button type="button" className="btn btn-outline text-sm" disabled={Boolean(accion)} onClick={() => cargar()}>
              Actualizar estado
            </button>
          </div>
          {(!puedeStock && stockCerrado) || (!puedeConsolidacionYTurno && (consCerrada || ctx.puede_reabrir_turno_aqui)) ? (
            <p className="text-xs text-gray-600 mt-3">
              Si falta algún permiso, solicite a un usuario con <code className="text-xs bg-white/80 px-1 rounded">conciliacion_stock.editar</code> o{' '}
              <code className="text-xs bg-white/80 px-1 rounded">turno.cerrar</code> según el paso.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
