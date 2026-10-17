import { env } from '../env.ts'
import { HttpError } from '../http.ts'
import { storeImage } from './storage.ts'

/**
 * Fragplace Fragrance API (via RapidAPI): a licensed fragrance database the admin uses to pre-fill
 * fragrances (year, notes, accords, bottle photo) and brands (description, logos).
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
  description?: string
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

async function search(
  index: 'fragrances_en' | 'brands',
  q: string,
  filter: string,
  attributes: string[] = ATTRIBUTES,
): Promise<Hit[]> {
  if (!env.RAPIDAPI_KEY)
    throw new HttpError(503, 'lookup_unconfigured', 'Fragrance lookup isn’t set up: add RAPIDAPI_KEY to the server.')
  let res: Response
  try {
    res = await fetch(`https://${API_HOST}/indexes/${index}/search`, {
      method: 'POST',
      headers: { 'x-rapidapi-key': env.RAPIDAPI_KEY, 'x-rapidapi-host': API_HOST, 'content-type': 'application/json' },
      body: JSON.stringify({ q, filter, limit: LIMIT, attributesToRetrieve: attributes }),
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
  let hits = await search('fragrances_en', name, `brand.name = ${quote(brand)} AND ${published}`)
  if (!hits.length) hits = await search('fragrances_en', name, published)
  return hits.map(toMatch)
}

// ── Images ──────────────────────────────────────────────────────────────────

/** Fragplace's originals live in this bucket; previews point at them through one of two resizing services */
const SOURCE_PREFIX = 'https://s3.nl-ams.scw.cloud/fraghead-production/'

/** The original image behind a Fragplace preview URL, or null if it isn't one */
function sourceOf(preview: string): string | null {
  try {
    const u = new URL(preview)
    if (u.protocol !== 'https:') return null
    let source: string | null = null
    if (u.hostname === IMAGE_HOST) source = decodeURIComponent(u.pathname.split('/plain/')[1] ?? '')
    else if (u.hostname === 'imaginary.hernas.com') source = u.searchParams.get('url')
    return source?.startsWith(SOURCE_PREFIX) ? source : null
  } catch {
    return null
  }
}

/** Downloads the original through imgproxy with the given processing options, as WebP */
async function fetchProcessed(preview: string, options: string, what: string) {
  const source = sourceOf(preview)
  if (!source) throw new HttpError(400, 'invalid_request', 'That image isn’t from the fragrance database.')
  const failed = () =>
    new HttpError(502, 'lookup_failed', `Couldn’t download that ${what}. Try again or upload your own.`)
  let res: Response
  try {
    res = await fetch(`https://${IMAGE_HOST}/insecure/${options}/f:webp/plain/${encodeURIComponent(source)}`, {
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw failed()
  }
  const data = Buffer.from(await res.arrayBuffer())
  if (!res.ok || res.headers.get('content-type') !== 'image/webp' || !data.length || data.length > 4 * 1024 * 1024)
    throw failed()
  return data
}

/** Width and height from a WebP file's header (lossy, lossless and extended formats) */
export function webpSize(b: Buffer): { width: number; height: number } | undefined {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return undefined
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) }
  if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }
  }
  return undefined
}

/**
 * Copies a match's bottle photo into our own storage (Vercel Blob in production), so the shop never loads
 * images from Fragplace. Requested as a 900×1200 WebP with the bottle centred on white.
 */
export async function importFragplacePhoto(thumb: string) {
  const data = await fetchProcessed(
    thumb,
    `rs:fit:${PHOTO.width}:${PHOTO.height}:0:1/g:ce/bg:255:255:255/q:85`,
    'photo',
  )
  const stored = await storeImage(data, 'image/webp', 'fragrances')
  return { ...stored, ...PHOTO }
}

// ── Brands ──────────────────────────────────────────────────────────────────

export interface FragplaceBrand {
  id: number
  name: string
  description: string
  thumb: string | null
  url: string
}

/** Up to 5 brands matching a name, most popular first among equally good matches */
export async function findBrands(name: string): Promise<FragplaceBrand[]> {
  const hits = await search('brands', name, 'status = published', ['id', 'name', 'description', 'image'])
  return hits.map((h) => ({
    id: h.id,
    name: h.name.trim(),
    description: (h.description ?? '').trim(),
    thumb: h.image?.url ?? null,
    url: `https://fragplace.com/brands/${h.id}`,
  }))
}

/**
 * A brand's logo as two files: a large one for desktop and a smaller one for phones.
 * The plain white margin around the artwork is trimmed off; the shop blends the white into the banner.
 */
export async function importFragplaceLogo(thumb: string) {
  const one = async (box: string) => {
    const data = await fetchProcessed(thumb, `t:12:FFFFFF/rs:fit:${box}:0:0/q:90`, 'logo')
    return { ...(await storeImage(data, 'image/webp', 'brands')), ...webpSize(data) }
  }
  const [desktop, mobile] = await Promise.all([one('1200:480'), one('720:240')])
  return { desktop, mobile }
}
