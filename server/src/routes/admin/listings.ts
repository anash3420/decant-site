import { Router } from 'express'
import type { Types } from 'mongoose'
import { z } from 'zod'
import { HttpError, notFound } from '../../http.ts'
import {
  CatchReleaseListing,
  DecantListing,
  Fragrance,
  FullBottleListing,
  Inquiry,
  Listing,
} from '../../models/index.ts'
import { deleteImage } from '../../services/storage.ts'
import type { LeanFragrance, LeanListing } from '../../models/lean.ts'
import { objectId, searchRegex } from '../../validation.ts'

export const listingsRouter = Router()

const money = z.number().min(0).max(100_000)
const optionalMoney = money.nullish().transform((v) => v ?? undefined)

const photo = z.object({
  _id: objectId.optional(),
  url: z.string().min(1).max(1000),
  pathname: z.string().max(500).optional(),
  label: z.string().trim().max(60).default(''),
  order: z.number().int().default(0),
})

const common = {
  // Accept the id, or the { id, ... } object GET returns, so a loaded listing can be sent straight back
  fragrance: z.preprocess((v) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v), objectId),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,120}$/, 'Use lowercase letters, numbers and dashes')
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  listingNote: z.string().trim().max(500).default(''),
  addedAt: z.coerce.date().optional(),
  photos: z.array(photo).max(12).default([]),
}

const decantInput = z.object({
  kind: z.literal('decant'),
  ...common,
  // Existing _ids are kept so held-stock records (inquiry.heldFrom) keep pointing at the right bottle
  bottles: z
    .array(
      z.object({
        _id: objectId.optional(),
        sizeMl: z.number().positive().max(1000),
        remainingMl: z.number().min(0).max(1000),
        batchCode: z.string().trim().max(40).optional(),
        acquiredAt: z.coerce.date().optional(),
        costPaid: optionalMoney,
      }),
    )
    .min(1, 'Add at least one bottle')
    .max(10)
    .refine((bs) => bs.every((b) => b.remainingMl <= b.sizeMl), 'A bottle can’t have more left than its size'),
  prices: z
    .array(z.object({ sizeMl: z.number().positive().max(200), price: money }))
    .min(1, 'Add at least one decant size')
    .max(10)
    .refine((ps) => new Set(ps.map((p) => p.sizeMl)).size === ps.length, 'Each decant size can only be listed once')
    .transform((ps) => [...ps].sort((a, b) => a.sizeMl - b.sizeMl)),
})

const catchReleaseInput = z.object({
  kind: z.literal('catch-release'),
  ...common,
  vials: z
    .array(
      z.object({
        _id: objectId.optional(),
        sizeMl: z.number().positive().max(200),
        format: z.string().trim().min(1).max(40),
        price: money,
        qty: z.number().int().min(0).max(999),
        note: z.string().trim().max(120).optional(),
        sourcedFrom: z.string().trim().max(120).optional(),
        costPaid: optionalMoney,
      }),
    )
    .min(1, 'Add at least one vial')
    .max(20),
})

const fullBottleInput = z.object({
  kind: z.literal('full-bottle'),
  ...common,
  bottleSizeMl: z.number().positive().max(1000),
  fillPercent: z.number().int().min(0).max(100),
  hasBox: z.boolean(),
  condition: z.string().trim().max(500).default(''),
  price: money,
  sold: z.boolean().default(false),
  costPaid: optionalMoney,
})

const listingInput = z.discriminatedUnion('kind', [decantInput, catchReleaseInput, fullBottleInput])
type ListingInput = z.infer<typeof listingInput>

const MODELS = {
  decant: DecantListing,
  'catch-release': CatchReleaseListing,
  'full-bottle': FullBottleListing,
} as const

/** Turns validated input into document fields (sold → soldAt, brand slug from the fragrance) */
async function toFields(input: ListingInput, existingSoldAt?: Date | null) {
  const fragrance = await Fragrance.findById(input.fragrance).populate<{ brand: { slug: string } }>('brand', 'slug')
  if (!fragrance) throw new HttpError(400, 'invalid_request', 'That fragrance no longer exists.')
  const { kind: _kind, slug: _slug, ...rest } = input
  const fields: Record<string, unknown> = { ...rest, brandSlug: fragrance.brand.slug }
  if (input.kind === 'full-bottle') {
    delete fields.sold
    // Keep the original sold date when it was already sold
    fields.soldAt = input.sold ? (existingSoldAt ?? new Date()) : null
  }
  return { fields, fragranceSlug: fragrance.slug }
}

async function uniqueSlug(wanted: string, excludeId?: Types.ObjectId) {
  let slug = wanted
  for (let n = 2; await Listing.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); n++)
    slug = `${wanted}-${n}`
  return slug
}

function defaultSlug(input: ListingInput, fragranceSlug: string) {
  if (input.kind === 'catch-release') return `${fragranceSlug}-cr`
  if (input.kind === 'full-bottle') return `${fragranceSlug}-${input.bottleSizeMl}ml`
  return fragranceSlug
}

const populate = { path: 'fragrance', select: 'name slug brand tint', populate: { path: 'brand', select: 'name slug' } }

listingsRouter.get('/', async (req, res) => {
  const q = z
    .object({
      kind: z.enum(['decant', 'catch-release', 'full-bottle']).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      search: z.string().trim().max(100).optional(),
    })
    .parse(req.query)
  const filter: Record<string, unknown> = {}
  if (q.kind) filter.kind = q.kind
  if (q.status) filter.status = q.status
  if (q.search) {
    const rx = searchRegex(q.search)
    const fragranceIds = await Fragrance.find({ name: rx }).distinct('_id')
    filter.$or = [{ slug: rx }, { brandSlug: rx }, { fragrance: { $in: fragranceIds } }]
  }
  const docs = await Listing.find(filter).sort({ addedAt: -1 }).populate(populate).lean<AdminListingDoc[]>()
  res.json({ listings: docs.map(toAdminListing) })
})

listingsRouter.get('/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const doc = await Listing.findById(id).populate(populate).lean<AdminListingDoc>()
  if (!doc) throw notFound('Listing')
  const openInquiries = await Inquiry.countDocuments({
    'items.listing': id,
    status: { $in: ['new', 'contacted', 'confirmed'] },
  })
  res.json({ listing: { ...toAdminListing(doc), openInquiries } })
})

listingsRouter.post('/', async (req, res) => {
  const input = listingInput.parse(req.body)
  const { fields, fragranceSlug } = await toFields(input)
  const slug = await uniqueSlug(input.slug ?? defaultSlug(input, fragranceSlug))
  const created = await (MODELS[input.kind] as typeof Listing).create({ ...fields, slug })
  const doc = await Listing.findById(created._id).populate(populate).lean<AdminListingDoc>()
  res.status(201).json({ listing: toAdminListing(doc!) })
})

/** Full update of a listing's editable fields; the kind can't change */
listingsRouter.patch('/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const existing = await Listing.findById(id)
  if (!existing) throw notFound('Listing')

  const input = listingInput.parse({ ...req.body, kind: existing.get('kind') })
  const { fields } = await toFields(input, existing.get('soldAt'))
  if (input.slug && input.slug !== existing.slug) {
    if (await Listing.exists({ slug: input.slug, _id: { $ne: id } }))
      throw new HttpError(409, 'slug_taken', 'Another listing already uses that link.')
    fields.slug = input.slug
  }

  const removedPhotos = existing.photos.filter((p) => !input.photos.some((n) => n.url === p.url))
  existing.set(fields)
  await existing.save()
  await Promise.all(removedPhotos.map((p) => deleteImage(p)))

  const doc = await Listing.findById(id).populate(populate).lean<AdminListingDoc>()
  res.json({ listing: toAdminListing(doc!) })
})

/** Only listings nobody has inquired about can be deleted; others should be archived to keep history intact */
listingsRouter.delete('/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const doc = await Listing.findById(id)
  if (!doc) throw notFound('Listing')
  if (await Inquiry.exists({ 'items.listing': id }))
    throw new HttpError(
      409,
      'in_use',
      'This listing appears in inquiries. Archive it instead so their history stays intact.',
    )
  await doc.deleteOne()
  await Promise.all(doc.photos.map((p) => deleteImage(p)))
  res.json({ ok: true })
})

// Admin view: everything, including costs. Never reuse for public responses.
type AdminListingDoc = LeanListing<Pick<LeanFragrance, '_id' | 'name' | 'slug' | 'tint' | 'brand'>>

/** Subdocuments with their ids as strings, so the admin can send them back to keep held-stock links */
const withStringIds = <T extends { _id: Types.ObjectId }>(xs: T[] | undefined) =>
  (xs ?? []).map(({ _id, ...rest }) => ({ _id: String(_id), ...rest }))

// Admin view: everything, including costs. Never reuse for public responses.
function toAdminListing(d: AdminListingDoc) {
  const f = d.fragrance
  const base = {
    id: String(d._id),
    slug: d.slug,
    kind: d.kind,
    status: d.status,
    listingNote: d.listingNote ?? '',
    addedAt: d.addedAt,
    updatedAt: d.updatedAt,
    photos: [...d.photos]
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ _id: String(p._id), url: p.url, pathname: p.pathname, label: p.label, order: p.order })),
    fragrance: f
      ? {
          id: String(f._id),
          name: f.name,
          slug: f.slug,
          tint: f.tint,
          brand: f.brand && { name: f.brand.name, slug: f.brand.slug },
        }
      : null,
  }
  switch (d.kind) {
    case 'decant':
      return { ...base, bottles: withStringIds(d.bottles), prices: d.prices ?? [] }
    case 'catch-release':
      return { ...base, vials: withStringIds(d.vials) }
    case 'full-bottle':
      return {
        ...base,
        bottleSizeMl: d.bottleSizeMl,
        fillPercent: d.fillPercent,
        hasBox: d.hasBox,
        condition: d.condition,
        price: d.price,
        sold: Boolean(d.soldAt),
        soldAt: d.soldAt,
        costPaid: d.costPaid,
      }
  }
}
