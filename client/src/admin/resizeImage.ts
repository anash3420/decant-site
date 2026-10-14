/**
 * Shrinks a phone photo before upload: max 1600px on the long edge, WebP (JPEG fallback).
 * A 12MP camera shot goes from ~4MB to ~200KB, which keeps uploads fast on mobile data
 * and under Vercel's 4.5MB request limit.
 */
export async function resizeImage(file: File, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  // Safari before 17 can't encode WebP and silently returns PNG; fall back to JPEG then
  const webp = await encode('image/webp')
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await encode('image/jpeg')
  if (!jpeg) throw new Error('Could not process this image.')
  return jpeg
}
