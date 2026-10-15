import { PHOTO_ASPECT, type Orientation } from '../lib/photos.ts'

/** A region of the photo in its own pixels (as the cropper reports it). May extend past the edges. */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

/** Padding colour when the crop is zoomed out past the photo's edges */
const FILL = '#ffffff'

/**
 * Crops a phone photo to the chosen area and shape, then shrinks it for upload: max 1600px on the long edge,
 * WebP (JPEG fallback). Returns the image plus its final size, which the listing stores.
 * A 12MP camera shot goes from ~4MB to ~200KB, which keeps uploads fast on mobile data
 * and under Vercel's 4.5MB request limit.
 */
export async function cropAndResize(
  file: File,
  area: CropArea,
  orientation: Orientation,
  maxEdge = 1600,
): Promise<{ blob: Blob; width: number; height: number }> {
  // from-image applies the camera's EXIF rotation, matching how the cropper displayed it
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxEdge / Math.max(area.width, area.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(area.width * scale)
  // Derive height from the exact shape so rounding never drifts off 4:3 / 3:4
  canvas.height = Math.round(canvas.width / PHOTO_ASPECT[orientation])

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = FILL
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  // Shift the whole photo so the chosen area lands at the canvas origin; anything outside is clipped
  ctx.drawImage(bitmap, -area.x * scale, -area.y * scale, bitmap.width * scale, bitmap.height * scale)
  bitmap.close()

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  // Safari before 17 can't encode WebP and silently returns PNG; fall back to JPEG then
  const size = { width: canvas.width, height: canvas.height }
  const webp = await encode('image/webp')
  if (webp && webp.type === 'image/webp') return { blob: webp, ...size }
  const jpeg = await encode('image/jpeg')
  if (!jpeg) throw new Error('Could not process this image.')
  return { blob: jpeg, ...size }
}
