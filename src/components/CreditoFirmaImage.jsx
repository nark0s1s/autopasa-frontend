import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Crop, Minus, Plus, RotateCcw } from 'lucide-react'
import { fetchCreditoPersonaFirmaBlobUrl } from '../utils/api'
import { detectContentBounds } from '../utils/imageContentCrop'

const ZOOM_MIN = 1
const ZOOM_MAX = 8
const ZOOM_STEP = 0.4

/**
 * Visor de firma: siempre usa el blob original (sin recomprimir).
 * “Recortar” solo encuadra el contenido con zoom óptico sobre la imagen nativa.
 */
export default function CreditoFirmaImage({
  personaId,
  alt = 'Firma',
  className = '',
  interactive = false,
  onError,
}) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [bounds, setBounds] = useState(null)
  const [focusContent, setFocusContent] = useState(false)
  const [trimBusy, setTrimBusy] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [layout, setLayout] = useState({ vw: 0, vh: 0 })
  const dragRef = useRef(null)
  const viewportRef = useRef(null)

  useEffect(() => {
    let revoke = null
    let cancelled = false
    setSrc(null)
    setFailed(false)
    setNatural({ w: 0, h: 0 })
    setBounds(null)
    setFocusContent(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    if (!personaId) return undefined

    fetchCreditoPersonaFirmaBlobUrl(personaId)
      .then(async (url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        revoke = url
        setSrc(url)
        const probe = new Image()
        probe.onload = () => {
          if (!cancelled) {
            setNatural({
              w: probe.naturalWidth || probe.width,
              h: probe.naturalHeight || probe.height,
            })
          }
        }
        probe.src = url
        if (interactive) {
          setTrimBusy(true)
          try {
            const b = await detectContentBounds(url)
            if (cancelled) return
            if (b) {
              setBounds(b)
              setNatural({ w: b.imgW, h: b.imgH })
              setFocusContent(true)
            }
          } catch {
            /* ignore */
          } finally {
            if (!cancelled) setTrimBusy(false)
          }
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

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el || !interactive) return undefined
    const measure = () => {
      setLayout({ vw: el.clientWidth, vh: el.clientHeight })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [interactive, src])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const zoomBy = useCallback((delta) => {
    setZoom((z) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100))
      if (next <= ZOOM_MIN) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const applyFocus = useCallback(async () => {
    if (!src) return
    if (bounds) {
      setFocusContent(true)
      resetView()
      return
    }
    setTrimBusy(true)
    try {
      const b = await detectContentBounds(src)
      if (b) {
        setBounds(b)
        setFocusContent(true)
        resetView()
      }
    } finally {
      setTrimBusy(false)
    }
  }, [src, bounds, resetView])

  const showFullPage = useCallback(() => {
    setFocusContent(false)
    resetView()
  }, [resetView])

  const onPointerDown = (e) => {
    if (zoom <= 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    }
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    setPan({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
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
        if (next <= ZOOM_MIN) setPan({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => el.removeEventListener('wheel', onWheelNative)
  }, [interactive, src])

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-500 text-sm ${className}`}>
        Sin imagen
      </div>
    )
  }

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-400 text-sm animate-pulse ${className}`}>
        Cargando firma…
      </div>
    )
  }

  if (!interactive) {
    return <img src={src} alt={alt} className={`object-contain bg-white ${className}`} />
  }

  const { vw, vh } = layout
  const imgW = natural.w || bounds?.imgW || 0
  const imgH = natural.h || bounds?.imgH || 0
  const crop =
    focusContent && bounds
      ? bounds
      : imgW && imgH
        ? { x: 0, y: 0, w: imgW, h: imgH, imgW, imgH }
        : null

  // Escala base: el área enfocada llena el viewport (píxeles nativos → CSS)
  let baseScale = 1
  if (crop && vw > 0 && vh > 0) {
    baseScale = Math.min(vw / crop.w, vh / crop.h)
  }
  const totalScale = baseScale * zoom
  const drawnW = crop ? crop.imgW * totalScale : 0
  const drawnH = crop ? crop.imgH * totalScale : 0
  const originX = crop ? -crop.x * totalScale + (vw - crop.w * totalScale) / 2 : 0
  const originY = crop ? -crop.y * totalScale + (vh - crop.h * totalScale) / 2 : 0

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
        {focusContent && bounds ? (
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
            title="Encuadrar contenido (sin recomprimir)"
            onClick={applyFocus}
            disabled={trimBusy || !src}
          >
            <Crop className="w-4 h-4" />
            <span className="text-xs font-semibold">Enfocar</span>
          </button>
        )}
        {trimBusy && <span className="text-xs text-slate-600 ml-1">Analizando…</span>}
      </div>

      <div
        ref={viewportRef}
        className={`relative h-64 sm:h-72 bg-white overflow-hidden touch-none ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {crop && vw > 0 ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="absolute select-none pointer-events-none"
            style={{
              width: drawnW,
              height: drawnH,
              left: originX + pan.x,
              top: originY + pan.y,
              maxWidth: 'none',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="max-w-full max-h-full object-contain select-none pointer-events-none"
            />
          </div>
        )}
      </div>
      <p className="px-2 py-1 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
        Imagen original a máxima calidad · {focusContent ? 'contenido enfocado' : 'página completa'} · +/− o rueda
        para zoom · arrastre para mover
      </p>
    </div>
  )
}
