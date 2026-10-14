import type { Types } from 'mongoose'
import type { Fragrance as CatalogListing, ListingKind } from '../../../shared/types.ts'
import { Listing } from '../models/index.ts'

/**
 * Turns listing + fragrance + brand documents into the flat shape the client was built against
 * (shared/types.ts `Fragrance`). Admin-only fields (costPaid, sourcedFrom, batch codes) never leave here.
 */

interface PopulatedListing {
  _id: Types.ObjectId
  slug: string
  kind: ListingKind
  brandSlug: string
  addedAt: Date
  listingNote?: string
  photos: { _id: Types.ObjectId; url: string; label: string; order: number }[]
  fragrance: {
    name: string
    concentration: string
    year?: number
    gender: CatalogListing['gender']
    accords: string[]
    notes: CatalogListing['notes']
    description: string
    tint: string
    brand: { name: string; slug: string }
  }
  // kind-specific
  bottles?: { _id: Types.ObjectId; sizeMl: number; remainingMl: number }[]
  prices?: { sizeMl: number; price: number }[]
  vials?: { _id: Types.ObjectId; sizeMl: number; format: string; price: number; qty: number; note?: string }[]
  bottleSizeMl?: number
  fillPercent?: number
  hasBox?: boolean
  condition?: string
  price?: number
  soldAt?: Date | null
}

export function toCatalogListing(l: PopulatedListing): CatalogListing {
  const f = l.fragrance
  const base = {
    slug: l.slug,
    name: f.name,
    house: f.brand.name,
    concentration: f.concentration,
    year: f.year ?? undefined,
    gender: f.gender,
    accords: f.accords,
    notes: f.notes,
    // A listing note ("picked up in a CFE split") reads best after the scent description
    description: [f.description, l.listingNote].filter(Boolean).join(' '),
    tint: f.tint,
    photos: l.photos.length
      ? [...l.photos].sort((a, b) => a.order - b.order).map((p) => ({ label: p.label, src: p.url }))
      : undefined,
    addedAt: l.addedAt.toISOString().slice(0, 10),
  }

  switch (l.kind) {
    case 'decant':
      return {
        ...base,
        kind: 'decant',
        bottles: (l.bottles ?? []).map((b) => ({ id: String(b._id), sizeMl: b.sizeMl, remainingMl: b.remainingMl })),
        prices: (l.prices ?? []).map(({ sizeMl, price }) => ({ sizeMl, price })),
      }
    case 'catch-release':
      return {
        ...base,
        kind: 'catch-release',
        vials: (l.vials ?? []).map((v) => ({
          id: String(v._id),
          sizeMl: v.sizeMl,
          format: v.format,
          price: v.price,
          qty: v.qty,
          note: v.note,
        })),
      }
    case 'full-bottle':
      return {
        ...base,
        kind: 'full-bottle',
        bottleSizeMl: l.bottleSizeMl!,
        fillPercent: l.fillPercent!,
        hasBox: l.hasBox!,
        condition: l.condition ?? '',
        price: l.price!,
        sold: Boolean(l.soldAt),
      }
  }
}

const populateFragrance = { path: 'fragrance', populate: { path: 'brand', select: 'name slug' } }

export async function findCatalog(filter: { kind?: ListingKind; brand?: string }) {
  const query: Record<string, unknown> = { status: 'published' }
  if (filter.kind) query.kind = filter.kind
  if (filter.brand) query.brandSlug = filter.brand
  const docs = await Listing.find(query).sort({ addedAt: -1 }).populate(populateFragrance).lean()
  return (docs as unknown as PopulatedListing[]).map(toCatalogListing)
}

export async function findCatalogListing(slug: string) {
  const doc = await Listing.findOne({ slug, status: 'published' }).populate(populateFragrance).lean()
  return doc ? toCatalogListing(doc as unknown as PopulatedListing) : null
}

/** Used by inquiries: the same shape, but read inside a transaction session */
export async function findCatalogListingsForUpdate(slugs: string[], session: import('mongoose').ClientSession) {
  const docs = await Listing.find({ slug: { $in: slugs }, status: 'published' })
    .populate(populateFragrance)
    .session(session)
    .lean()
  return (docs as unknown as PopulatedListing[]).map((d) => ({ id: d._id, listing: toCatalogListing(d) }))
}
