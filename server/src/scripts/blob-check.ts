/**
 * Checks the Vercel Blob setup end to end: upload → public download → cache header → delete.
 * Leaves nothing behind. Run after putting BLOB_READ_WRITE_TOKEN in .env (or with it set on Vercel).
 *
 *   npm run blob:check
 */
import { del, head, put } from '@vercel/blob'
import { env } from '../env.ts'

if (!env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set in server/.env, so photos are stored locally. Nothing to check.')
  process.exit(1)
}
const token = env.BLOB_READ_WRITE_TOKEN

// 1×1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const step = (label: string) => process.stdout.write(`  ${label}… `)
let url = ''
try {
  step('Uploading a test image')
  const blob = await put(`healthcheck/${Date.now()}.png`, PNG, {
    access: 'public',
    contentType: 'image/png',
    cacheControlMaxAge: 365 * 24 * 60 * 60,
    token,
  })
  url = blob.url
  console.log('ok')
  console.log(`    ${url}`)

  step('Downloading it like a shopper would (no token)')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: is the store set to Public access?`)
  console.log(`ok (${res.headers.get('content-type')})`)

  step('Checking it may be cached for a year')
  const meta = await head(url, { token })
  console.log(meta.cacheControl.includes('max-age=31536000') ? 'ok' : `unexpected: ${meta.cacheControl}`)
} catch (err) {
  console.log('failed')
  console.error(`\n${(err as Error).message}`)
  process.exitCode = 1
} finally {
  if (url) {
    step('Deleting the test image')
    await del(url, { token })
    console.log('ok')
  }
}
console.log(process.exitCode ? '\nBlob is NOT ready.' : '\nVercel Blob is ready: photo uploads will go there.')
