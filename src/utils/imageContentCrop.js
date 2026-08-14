/**
 * Recorta márgenes casi blancos de un escaneo (p. ej. orden en hoja A4).
 * Devuelve un data URL JPEG o null si no hubo recorte útil.
 */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * @param {string} src blob/object/data URL
 * @param {{ threshold?: number, padding?: number, minShrink?: number }} opts
 * @returns {Promise<string|null>} data URL recortada o null
 */
export async function trimWhitespaceFromImageSrc(src, opts = {}) {
  const threshold = opts.threshold ?? 248
  const padding = opts.padding ?? 12
  const minShrink = opts.minShrink ?? 0.08 // solo recortar si reduce ≥8%

  const img = await loadImage(src)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return null

  // Muestrear si es muy grande (perf)
  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const sw = Math.max(1, Math.round(w * scale))
  const sh = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, sw, sh)
  ctx.drawImage(img, 0, 0, sw, sh)

  const { data } = ctx.getImageData(0, 0, sw, sh)
  let minX = sw
  let minY = sh
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const i = (y * sw + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 20) continue
      // Contenido: no casi blanco
      if (r < threshold || g < threshold || b < threshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null

  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(sw - 1, maxX + padding)
  maxY = Math.min(sh - 1, maxY + padding)

  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const areaRatio = (cw * ch) / (sw * sh)
  if (areaRatio > 1 - minShrink) return null

  // Recortar en resolución original
  const ox = Math.floor(minX / scale)
  const oy = Math.floor(minY / scale)
  const ow = Math.min(w - ox, Math.ceil(cw / scale))
  const oh = Math.min(h - oy, Math.ceil(ch / scale))

  const out = document.createElement('canvas')
  out.width = ow
  out.height = oh
  const octx = out.getContext('2d')
  octx.fillStyle = '#ffffff'
  octx.fillRect(0, 0, ow, oh)
  octx.drawImage(img, ox, oy, ow, oh, 0, 0, ow, oh)
  return out.toDataURL('image/jpeg', 0.92)
}

/**
 * Recorta un File de imagen y devuelve un nuevo File (o el original si no aplica).
 */
export async function trimWhitespaceFromFile(file) {
  if (!file || !file.type?.startsWith('image/')) return file
  const url = URL.createObjectURL(file)
  try {
    const trimmed = await trimWhitespaceFromImageSrc(url)
    if (!trimmed) return file
    const blob = await (await fetch(trimmed)).blob()
    const base = (file.name || 'firma').replace(/\.[^.]+$/, '')
    return new File([blob], `${base}_recorte.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
