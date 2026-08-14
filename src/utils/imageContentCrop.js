/**
 * Detecta / recorta márgenes casi blancos de un escaneo (orden en hoja A4)
 * sin bajar la resolución ni recomprimir de más.
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
 * @returns {Promise<null | { x: number, y: number, w: number, h: number, imgW: number, imgH: number }>}
 * Coordenadas en píxeles de la imagen original.
 */
export async function detectContentBounds(src, opts = {}) {
  const threshold = opts.threshold ?? 248
  const padding = opts.padding ?? 16
  const minShrink = opts.minShrink ?? 0.08

  const img = await loadImage(src)
  const imgW = img.naturalWidth || img.width
  const imgH = img.naturalHeight || img.height
  if (!imgW || !imgH) return null

  // Solo el análisis se muestrea; el recorte usa coords a resolución nativa.
  const maxSide = 1200
  const scale = Math.min(1, maxSide / Math.max(imgW, imgH))
  const sw = Math.max(1, Math.round(imgW * scale))
  const sh = Math.max(1, Math.round(imgH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, sw, sh)

  const { data } = ctx.getImageData(0, 0, sw, sh)
  let minX = sw
  let minY = sh
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const i = (y * sw + x) * 4
      const a = data[i + 3]
      if (a < 20) continue
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r < threshold || g < threshold || b < threshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null

  const pad = Math.round(padding * scale)
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(sw - 1, maxX + pad)
  maxY = Math.min(sh - 1, maxY + pad)

  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  if ((cw * ch) / (sw * sh) > 1 - minShrink) return null

  const x = Math.floor(minX / scale)
  const y = Math.floor(minY / scale)
  const w = Math.min(imgW - x, Math.ceil(cw / scale))
  const h = Math.min(imgH - y, Math.ceil(ch / scale))
  if (w < 8 || h < 8) return null

  return { x, y, w, h, imgW, imgH }
}

/**
 * Recorta a resolución nativa. Preferencia PNG (sin pérdida); si pesa mucho, JPEG 0.97.
 * @returns {Promise<File>} archivo original o recortado
 */
export async function trimWhitespaceFromFile(file, opts = {}) {
  if (!file || !file.type?.startsWith('image/')) return file
  const maxBytes = opts.maxBytes ?? 7.5 * 1024 * 1024
  const url = URL.createObjectURL(file)
  try {
    const bounds = await detectContentBounds(url)
    if (!bounds) return file

    const img = await loadImage(url)
    const out = document.createElement('canvas')
    out.width = bounds.w
    out.height = bounds.h
    const octx = out.getContext('2d')
    // imageSmoothingEnabled false evita “desenfoque” al copiar 1:1
    octx.imageSmoothingEnabled = false
    octx.drawImage(
      img,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      0,
      0,
      bounds.w,
      bounds.h,
    )

    const base = (file.name || 'firma').replace(/\.[^.]+$/, '')

    const pngBlob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'))
    if (pngBlob && pngBlob.size > 0 && pngBlob.size <= maxBytes) {
      return new File([pngBlob], `${base}_recorte.png`, { type: 'image/png' })
    }

    const jpgBlob = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.97))
    if (jpgBlob && jpgBlob.size > 0) {
      return new File([jpgBlob], `${base}_recorte.jpg`, { type: 'image/jpeg' })
    }
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
