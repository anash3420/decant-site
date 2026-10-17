import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BlobError, del, put } from '@vercel/blob'
import { env } from '../env.ts'
import { HttpError } from '../http.ts'

/**
 * Listing and fragrance photos. With BLOB_READ_WRITE_TOKEN set they go to Vercel Blob (required on Vercel, see env.ts);
 * without it (local dev) they're written to server/.uploads and served from /api/uploads.
 */

export const LOCAL_UPLOAD_DIR = fileURLToPath(new URL('../../.uploads/', import.meta.url))
const usingBlob = Boolean(env.BLOB_READ_WRITE_TOKEN)

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/** Every upload gets a fresh random name and is never edited in place, so browsers and the CDN can keep it a year */
const ONE_YEAR = 365 * 24 * 60 * 60

export async function storeImage(data: Buffer, contentType: string, folder: 'listings' | 'fragrances' = 'listings') {
  const ext = IMAGE_TYPES[contentType]
  if (!ext) throw new Error(`Unsupported image type ${contentType}`)
  const pathname = `${folder}/${randomUUID()}.${ext}`

  if (usingBlob) {
    try {
      const blob = await put(pathname, data, {
        access: 'public',
        contentType,
        cacheControlMaxAge: ONE_YEAR,
        token: env.BLOB_READ_WRITE_TOKEN,
      })
      return { url: blob.url, pathname: blob.pathname }
    } catch (err) {
      // Bad/expired token, a private store, quota… Log the detail, tell the admin something actionable
      console.error('Vercel Blob upload failed:', err)
      if (err instanceof BlobError)
        throw new HttpError(502, 'storage_error', 'Photo storage rejected the upload. Check the Blob store settings.')
      throw err
    }
  }

  await mkdir(LOCAL_UPLOAD_DIR + folder, { recursive: true })
  await writeFile(LOCAL_UPLOAD_DIR + pathname, data)
  return { url: `/api/uploads/${pathname}`, pathname }
}

/** Best effort: a missing file shouldn't block saving a listing */
export async function deleteImage(photo: { url: string; pathname?: string | null }) {
  try {
    // Decided per photo, so photos uploaded locally before switching to Blob still clean up
    if (photo.url.startsWith('http')) await del(photo.url, { token: env.BLOB_READ_WRITE_TOKEN })
    else if (photo.pathname && !photo.pathname.includes('..')) await unlink(LOCAL_UPLOAD_DIR + photo.pathname)
  } catch (err) {
    console.warn('Could not delete photo', photo.pathname ?? photo.url, (err as Error).message)
  }
}
