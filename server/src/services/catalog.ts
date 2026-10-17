import type { ClientSession } from 'mongoose'
import type { Fragrance as CatalogListing, FragranceCategory, ListingKind } from '../../../shared/types.ts'
import type { LeanListing } from '../models/lean.ts'
import { Fragrance, Listing } from '../models/index.ts'

/**
 * Turns listing + fragrance + brand documents into the flat shape the client was built against
 * (shared/types.ts `Fragrance`). Admin-only fields (costPaid, sourcedFrom, batch codes) never leave here.
 */

/** Null when the listing's fragrance or brand is missing, so it can't be shown */
function toCatalogListing(l: LeanListing): CatalogListing | null {
  const f = l.fragrance
  if (!f?.brand) return null
  const base = {
    slug: l.slug,
    name: f.name,
    house: f.brand.name,
    category: f.category ?? 'designer',
    concentration: f.concentration,
    year: f.year ?? undefined,
    gender: f.gender,
    accords: f.accords,
    notes: f.notes,
    // A listing note ("picked up in a CFE split") reads best after the scent description
    description: [f.description, l.listingNote].filter(Boolean).join(' '),
    tint: f.tint,
    photos: l.photos.length
      ? [...l.photos]
          .sort((a, b) => a.order - b.order)
          .map((p) => ({ label: p.label, src: p.url, width: p.width, height: p.height }))
      : // No listing photos yet: the fragrance's own bottle photo stands in
        f.photo
        ? [{ label: 'Bottle', src: f.photo.url, width: f.photo.width, height: f.photo.height }]
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
        bottleSizeMl: l.bottleSizeMl ?? 0,
        fillPercent: l.fillPercent ?? 0,
        hasBox: l.hasBox ?? false,
        condition: l.condition ?? '',
        price: l.price ?? 0,
        sold: Boolean(l.soldAt),
      }
  }
}

const populateFragrance = { path: 'fragrance', populate: { path: 'brand', select: 'name slug' } }
const shown = (l: CatalogListing | null): l is CatalogListing => l !== null

export async function findCatalog(filter: { kind?: ListingKind; brand?: string; category?: FragranceCategory }) {
  const query: Record<string, unknown> = { status: 'published' }
  if (filter.kind) query.kind = filter.kind
  if (filter.brand) query.brandSlug = filter.brand
  if (filter.category) query.fragrance = { $in: await Fragrance.find({ category: filter.category }).distinct('_id') }
  const docs = await Listing.find(query).sort({ addedAt: -1 }).populate(populateFragrance).lean<LeanListing[]>()
  return docs.map(toCatalogListing).filter(shown)
}

export async function findCatalogListing(slug: string) {
  const doc = await Listing.findOne({ slug, status: 'published' }).populate(populateFragrance).lean<LeanListing>()
  return doc ? toCatalogListing(doc) : null
}

/** Used by inquiries: the same shape, but read inside a transaction session */
export async function findCatalogListingsForUpdate(slugs: string[], session: ClientSession) {
  const docs = await Listing.find({ slug: { $in: slugs }, status: 'published' })
    .populate(populateFragrance)
    .session(session)
    .lean<LeanListing[]>()
  return docs.flatMap((d) => {
    const listing = toCatalogListing(d)
    return listing ? [{ id: d._id, listing }] : []
  })
}
