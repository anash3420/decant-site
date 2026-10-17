import { env } from '../env.ts'
import { HttpError } from '../http.ts'
import { storeImage } from './storage.ts'

/**
 * Fragplace Fragrance API (via RapidAPI): a licensed fragrance database used to look a fragrance up by
 * brand + name and pre-fill its year, notes, accords and bottle photo in the admin.
 * Search runs on Meilisearch, so it's typo-tolerant and can filter on brand.
 */

const API_HOST = 'fragrance-api.p.rapidapi.com'
/** Fragplace serves bottle images through imgproxy, which resizes and converts on request */
const IMAGE_HOST = 'imgproxy.hernas.com'
const LIMIT = 5
/** Same shape the admin cropper produces (portrait 3:4), padded with white so the whole bottle shows */
const PHOTO = { width: 900, height: 1200 }

interface Named {
  name: string
}
interface Hit {
  id: number
  name: string
  brand?: Named
  perfumers?: Named[]
  releasedAt?: number | null
  topNotes?: Named[]
  middleNotes?: Named[]
  baseNotes?: Named[]
  unknownNotes?: Named[]
  accords?: Named[]
  image?: { url?: string } | null
}

export interface FragplaceMatch {
  id: number
  name: string
  brand: string
  year: number | null
  perfumers: string[]
  /** Strongest first, as Fragplace ranks them */
  accords: string[]
  notes: { top: string[]; heart: string[]; base: string[] }
  /** 300px-wide preview, only for showing the choice in the admin */
  thumb: string | null
  url: string
}

const ATTRIBUTES = [
  'id',
  'name',
  'brand',
  'perfumers',
  'releasedAt',
  'topNotes',
  'middleNotes',
  'baseNotes',
  'unknownNotes',
  'accords',
  'image',
]

/** Fits the fragrance form's limits: 1–40 characters each, at most 20 */
const names = (xs: Named[] | undefined) =>
  [...new Set((xs ?? []).map((x) => x.name.trim()).filter((n) => n.length > 0 && n.length <= 40))].slice(0, 20)

const quote = (s: string) => `"${s.replace(/["\\]/g, '\\$&')}"`

async function search(q: string, filter: string): Promise<Hit[]> {
  if (!env.RAPIDAPI_KEY)
    throw new HttpError(503, 'lookup_unconfigured', 'Fragrance lookup isn’t set up: add RAPIDAPI_KEY to the server.')
  let res: Response
  try {
    res = await fetch(`https://${API_HOST}/indexes/fragrances_en/search`, {
      method: 'POST',
      headers: { 'x-rapidapi-key': env.RAPIDAPI_KEY, 'x-rapidapi-host': API_HOST, 'content-type': 'application/json' },
      body: JSON.stringify({ q, filter, limit: LIMIT, attributesToRetrieve: ATTRIBUTES }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new HttpError(502, 'lookup_failed', 'Couldn’t reach Fragplace. Try again in a moment.')
  }
  if (res.status === 429)
    throw new HttpError(429, 'lookup_limit', 'The Fragplace lookup limit was reached. Try again later.')
  if (!res.ok) {
    console.error('Fragplace search failed', res.status, await res.text().catch(() => ''))
    throw new HttpError(502, 'lookup_failed', 'Fragplace lookup failed. Try again in a moment.')
  }
  return ((await res.json()) as { hits?: Hit[] }).hits ?? []
}

function toMatch(h: Hit): FragplaceMatch {
  return {
    id: h.id,
    name: h.name.trim(),
    brand: h.brand?.name.trim() ?? '',
    year: h.releasedAt ? new Date(h.releasedAt * 1000).getUTCFullYear() : null,
    perfumers: names(h.perfumers),
    accords: names(h.accords).slice(0, 6),
    notes: {
      top: names(h.topNotes),
      heart: names(h.middleNotes),
      // Notes without a known level are rare; keeping them in the base beats dropping them
      base: names([...(h.baseNotes ?? []), ...(h.unknownNotes ?? [])]),
    },
    thumb: h.image?.url ?? null,
    url: `https://fragplace.com/fragrances/${h.id}`,
  }
}

/**
 * Up to 5 likely matches: the name within that brand first, then the name across all brands
 * (catches brands saved under a short name, e.g. "TF" for Tom Ford)
 */
export async function findFragrances(brand: string, name: string): Promise<FragplaceMatch[]> {
  const published = 'status = published'
  let hits = await search(name, `brand.name = ${quote(brand)} AND ${published}`)
  if (!hits.length) hits = await search(name, published)
  return hits.map(toMatch)
}

/**
 * Copies a match's bottle photo into our own storage (Vercel Blob in production), so the shop never loads
 * images from Fragplace. Only Fragplace's image host is accepted, and the image is requested as a
 * 900×1200 WebP with the bottle centred on white.
 */
export async function importFragplacePhoto(thumb: string) {
  let source: string | undefined
  try {
    const u = new URL(thumb)
    if (u.protocol === 'https:' && u.hostname === IMAGE_HOST) source = u.pathname.split('/plain/')[1]
  } catch {
    // handled below
  }
  if (!source) throw new HttpError(400, 'invalid_request', 'That image isn’t from Fragplace.')

  const url = `https://${IMAGE_HOST}/insecure/rs:fit:${PHOTO.width}:${PHOTO.height}:0:1/g:ce/bg:255:255:255/q:85/f:webp/plain/${source}`
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new HttpError(502, 'lookup_failed', 'Couldn’t download that photo. Try again or upload your own.')
  }
  const data = Buffer.from(await res.arrayBuffer())
  if (!res.ok || res.headers.get('content-type') !== 'image/webp' || !data.length || data.length > 4 * 1024 * 1024)
    throw new HttpError(502, 'lookup_failed', 'Couldn’t download that photo. Try again or upload your own.')
  const stored = await storeImage(data, 'image/webp', 'fragrances')
  return { ...stored, ...PHOTO }
}
