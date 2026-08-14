import { useCallback, useEffect, useRef, useState } from 'react'
import { Crop, Minus, Plus, RotateCcw } from 'lucide-react'
import { fetchCreditoPersonaFirmaBlobUrl } from '../utils/api'
import { trimWhitespaceFromImageSrc } from '../utils/imageContentCrop'

const ZOOM_MIN = 1
const ZOOM_MAX = 5
const ZOOM_STEP = 0.35

/**
 * Carga la firma con token. Con interactive=true: zoom, pan y recorte de márgenes blancos.
 */
export default function CreditoFirmaImage({
  personaId,
  alt = 'Firma',
  className = '',
  interactive = false,
  onError,
}) {
  const [rawSrc, setRawSrc] = useState(null)
  const [displaySrc, setDisplaySrc] = useState(null)
  const [trimmed, setTrimmed] = useState(false)
  const [trimBusy, setTrimBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const viewportRef = useRef(null)

  useEffect(() => {
    let revoke = null
    let cancelled = false
    setRawSrc(null)
    setDisplaySrc(null)
    setTrimmed(false)
    setFailed(false)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    if (!personaId) return undefined

    fetchCreditoPersonaFirmaBlobUrl(personaId)
      .then(async (url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        revoke = url
        setRawSrc(url)
        if (interactive) {
          setTrimBusy(true)
          try {
            const cropped = await trimWhitespaceFromImageSrc(url)
            if (cancelled) return
            if (cropped) {
              setDisplaySrc(cropped)
              setTrimmed(true)
            } else {
              setDisplaySrc(url)
            }
          } catch {
            if (!cancelled) setDisplaySrc(url)
          } finally {
            if (!cancelled) setTrimBusy(false)
          }
        } else {
          setDisplaySrc(url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          onError?.()
        }
      })

    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [personaId, interactive, onError])

  const resetView = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const zoomBy = useCallback((delta) => {
    setZoom((z) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100))
      if (next <= ZOOM_MIN) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const applyTrim = useCallback(async () => {
    if (!rawSrc || trimBusy) return
    setTrimBusy(true)
    try {
      const cropped = await trimWhitespaceFromImageSrc(rawSrc)
      if (cropped) {
        setDisplaySrc(cropped)
        setTrimmed(true)
        resetView()
      } else {
        setDisplaySrc(rawSrc)
        setTrimmed(false)
        resetView()
      }
    } finally {
      setTrimBusy(false)
    }
  }, [rawSrc, trimBusy, resetView])

  const showFullPage = useCallback(() => {
    if (!rawSrc) return
    setDisplaySrc(rawSrc)
    setTrimmed(false)
    resetView()
  }, [rawSrc, resetView])

  const onPointerDown = (e) => {
    if (zoom <= 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    }
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset({
      x: dragRef.current.origX + dx,
      y: dragRef.current.origY + dy,
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  useEffect(() => {
    const el = viewportRef.current
    if (!el || !interactive) return undefined
    const onWheelNative = (e) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
      setZoom((z) => {
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100))
        if (next <= ZOOM_MIN) setOffset({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => el.removeEventListener('wheel', onWheelNative)
  }, [interactive, displaySrc])

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-500 text-sm ${className}`}>
        Sin imagen
      </div>
    )
  }

  if (!displaySrc && !trimBusy) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-400 text-sm animate-pulse ${className}`}>
        Cargando firma…
      </div>
    )
  }

  if (!interactive) {
    if (!displaySrc) {
      return (
        <div className={`flex items-center justify-center bg-gray-50 text-gray-400 text-sm animate-pulse ${className}`}>
          Cargando firma…
        </div>
      )
    }
    return <img src={displaySrc} alt={alt} className={`object-contain bg-white ${className}`} />
  }

  const btnCls =
    'inline-flex items-center justify-center rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-40 h-9 w-9 shadow-sm'

  return (
    <div className={`rounded-xl border-2 border-slate-200 bg-slate-100 overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-slate-200/80 border-b border-slate-300">
        <button type="button" className={btnCls} title="Alejar" onClick={() => zoomBy(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold tabular-nums text-slate-700 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className={btnCls} title="Acercar" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>
          <Plus className="w-4 h-4" />
        </button>
        <button type="button" className={btnCls} title="Restablecer zoom" onClick={resetView}>
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-0.5" />
        {trimmed ? (
          <button
            type="button"
            className="h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            title="Ver escaneo completo (hoja A4)"
            onClick={showFullPage}
          >
            Página completa
          </button>
        ) : (
          <button
            type="button"
            className={`${btnCls} !w-auto px-2.5 gap-1`}
            title="Recortar márgenes en blanco y mostrar lo importante"
            onClick={applyTrim}
            disabled={trimBusy || !rawSrc}
          >
            <Crop className="w-4 h-4" />
            <span className="text-xs font-semibold">Recortar</span>
          </button>
        )}
        {trimBusy && <span className="text-xs text-slate-600 ml-1">Procesando…</span>}
      </div>

      <div
        ref={viewportRef}
        className={`relative h-56 sm:h-64 bg-white overflow-hidden touch-none ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {displaySrc ? (
          <div
            className="absolute inset-0 flex items-center justify-center will-change-transform"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={displaySrc}
              alt={alt}
              draggable={false}
              className="max-w-full max-h-full object-contain select-none pointer-events-none bg-white"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 animate-pulse">
            Cargando firma…
          </div>
        )}
      </div>
      <p className="px-2 py-1 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
        {trimmed
          ? 'Mostrando contenido recortado · use +/− o rueda para zoom · arrastre para mover'
          : 'Escaneo completo · pulse Recortar para quitar márgenes blancos · +/− para zoom'}
      </p>
    </div>
  )
}
