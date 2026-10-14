import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { del, put } from '@vercel/blob'
import { env } from '../env.ts'

/**
 * Listing photos. With BLOB_READ_WRITE_TOKEN (Vercel) files go to Vercel Blob;
 * without it (local dev) they're written to server/.uploads and served from /api/uploads.
 */

export const LOCAL_UPLOAD_DIR = fileURLToPath(new URL('../../.uploads/', import.meta.url))
export const usingBlob = Boolean(env.BLOB_READ_WRITE_TOKEN)

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export async function storeImage(data: Buffer, contentType: string) {
  const ext = IMAGE_TYPES[contentType]
  if (!ext) throw new Error(`Unsupported image type ${contentType}`)
  const pathname = `listings/${randomUUID()}.${ext}`

  if (usingBlob) {
    const blob = await put(pathname, data, { access: 'public', contentType, token: env.BLOB_READ_WRITE_TOKEN })
    return { url: blob.url, pathname: blob.pathname }
  }

  await mkdir(LOCAL_UPLOAD_DIR + 'listings', { recursive: true })
  await writeFile(LOCAL_UPLOAD_DIR + pathname, data)
  return { url: `/api/uploads/${pathname}`, pathname }
}

/** Best effort: a missing file shouldn't block saving a listing */
export async function deleteImage(photo: { url: string; pathname?: string | null }) {
  try {
    if (usingBlob && photo.url.startsWith('http')) await del(photo.url, { token: env.BLOB_READ_WRITE_TOKEN })
    else if (photo.pathname && !photo.pathname.includes('..')) await unlink(LOCAL_UPLOAD_DIR + photo.pathname)
  } catch (err) {
    console.warn('Could not delete photo', photo.pathname ?? photo.url, (err as Error).message)
  }
}
