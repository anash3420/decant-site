import { Router, type Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { searchListings } from '../../../shared/search.ts'
import { isSoldOut } from '../../../shared/stock.ts'
import { FRAGRANCE_CATEGORIES } from '../../../shared/types.ts'
import { INQUIRY_REFERENCE } from '../../../shared/validation.ts'
import { notFound } from '../http.ts'
import { Brand, Listing } from '../models/index.ts'
import { findCatalog, findCatalogListing } from '../services/catalog.ts'
import { createInquiry, createInquirySchema, getInquiryStatus } from '../services/inquiries.ts'
import { getPublicSettings } from '../services/settings.ts'

export const publicRouter = Router()

/**
 * Browsers always revalidate (stock changes matter); only Vercel's CDN keeps a short shared copy.
 * stale-while-revalidate must not go in Cache-Control, or Chrome serves the stale copy itself.
 */
function cdnCache(res: Response, seconds: number) {
  res.set('Cache-Control', 'no-cache')
  res.set('Vercel-CDN-Cache-Control', `max-age=${seconds}, stale-while-revalidate=300`)
}

const KIND = z.enum(['decant', 'catch-release', 'full-bottle'])
const SLUG = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,120}$/)

// Note: in-memory counters are per server instance. Fine locally and as a first line on Vercel;
// a shared store (e.g. Upstash) can replace it in epic 3 if spam shows up.
const inquiryLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'rate_limited', message: 'Too many inquiries in a short time. Please try again in a few minutes.' },
  },
})
const lookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Please slow down.' } },
})

publicRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

/** All published listings, newest first. ?kind=decant|catch-release|full-bottle  ?brand=<slug>  ?category=niche|designer|designer-private|dupe */
publicRouter.get('/catalog', async (req, res) => {
  const query = z
    .object({ kind: KIND.optional(), brand: SLUG.optional(), category: z.enum(FRAGRANCE_CATEGORIES).optional() })
    .parse(req.query)
  cdnCache(res, 30)
  res.json({ listings: await findCatalog(query) })
})

/**
 * Published listings whose house or name contain every word of ?q=, best matches first.
 * ?limit= caps the results (the header's suggestions ask for 5); `total` is the full count.
 */
publicRouter.get('/search', async (req, res) => {
  const { q, limit } = z
    .object({ q: z.string().trim().min(1).max(100), limit: z.coerce.number().int().min(1).max(100).optional() })
    .parse(req.query)
  // The catalog is small (one shop's shelf), so matching in memory is simpler than a text index
  const results = searchListings(await findCatalog({}), q, isSoldOut)
  cdnCache(res, 30)
  res.json({ results: limit ? results.slice(0, limit) : results, total: results.length })
})

publicRouter.get('/catalog/:slug', async (req, res) => {
  const slug = SLUG.parse(req.params.slug)
  const listing = await findCatalogListing(slug)
  if (!listing) throw notFound('Listing')
  cdnCache(res, 30)
  res.json({ listing })
})

/** Brands that have at least one published listing, with counts per kind */
publicRouter.get('/brands', async (_req, res) => {
  const counts = await Listing.aggregate<{ _id: { brand: string; kind: string }; count: number }>([
    { $match: { status: 'published' } },
    { $group: { _id: { brand: '$brandSlug', kind: '$kind' }, count: { $sum: 1 } } },
  ])
  const brands = await Brand.find(
    { slug: { $in: [...new Set(counts.map((c) => c._id.brand))] } },
    { name: 1, slug: 1, description: 1, logo: 1, logoMobile: 1 },
  )
    .sort({ name: 1 })
    .lean()
  cdnCache(res, 60)
  res.json({
    brands: brands.map((b) => {
      const mine = counts.filter((c) => c._id.brand === b.slug)
      return {
        slug: b.slug,
        name: b.name,
        // For the brand banner: description plus a desktop and an optional phone logo
        description: b.description ?? '',
        logo: b.logo?.url ? { src: b.logo.url, width: b.logo.width, height: b.logo.height } : null,
        logoMobile: b.logoMobile?.url
          ? { src: b.logoMobile.url, width: b.logoMobile.width, height: b.logoMobile.height }
          : null,
        count: mine.reduce((n, c) => n + c.count, 0),
        byKind: Object.fromEntries(mine.map((c) => [c._id.kind, c.count])),
      }
    }),
  })
})

publicRouter.get('/settings/public', async (_req, res) => {
  cdnCache(res, 60)
  res.json(await getPublicSettings())
})

publicRouter.post('/inquiries', inquiryLimiter, async (req, res) => {
  const input = createInquirySchema.parse(req.body)
  // Honeypot filled: look successful to the bot, store nothing
  if (input.website) {
    res.status(201).json({ inquiry: { reference: 'D-' + Math.random().toString(36).slice(2, 8).toUpperCase() } })
    return
  }
  const inquiry = await createInquiry(input, { ip: req.ip, userAgent: req.get('user-agent') })
  res.status(201).json({ inquiry })
})

/** Status only; never contact details. Lets a visitor's History show "Contacted" / "Confirmed". */
publicRouter.get('/inquiries/:reference/status', lookupLimiter, async (req, res) => {
  const reference = z.string().toUpperCase().regex(INQUIRY_REFERENCE).parse(req.params.reference)
  const status = await getInquiryStatus(reference)
  if (!status) throw notFound('Inquiry')
  res.set('Cache-Control', 'no-store')
  res.json(status)
})
