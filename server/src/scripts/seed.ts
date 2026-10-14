/**
 * Dev seed: loads the epic 1 mock catalog and site settings into MongoDB.
 * Wipes brands, fragrances, listings, inquiries and settings first. Admin accounts are left alone.
 *
 *   npm run seed
 */
import type { Types } from 'mongoose'
import { connectDb, disconnectDb } from '../db.ts'
import {
  Brand,
  Fragrance,
  Listing,
  DecantListing,
  CatchReleaseListing,
  FullBottleListing,
  Inquiry,
  Settings,
} from '../models/index.ts'
import { slugify } from '../../../shared/slug.ts'
import { defaultSettings, fragrances as mock } from './seed-data.ts'
import { env } from '../env.ts'

if (env.NODE_ENV === 'production') {
  console.error('Refusing to seed a production database.')
  process.exit(1)
}

await connectDb()

const models = [Brand, Fragrance, Listing, Inquiry, Settings] as const
for (const m of models) await (m as typeof Brand).deleteMany({})
// Make sure unique indexes exist before inserting, so duplicates fail loudly
for (const m of models) await (m as typeof Brand).syncIndexes()

// Brands
const brandIds = new Map<string, Types.ObjectId>()
for (const house of new Set(mock.map((m) => m.house))) {
  const brand = await Brand.create({ name: house, slug: slugify(house) })
  brandIds.set(house, brand._id)
}

// Fragrances: one per house + name, shared by every listing of it
const fragranceIds = new Map<string, Types.ObjectId>()
for (const m of mock) {
  const key = slugify(`${m.house} ${m.name}`)
  if (fragranceIds.has(key)) continue
  const fragrance = await Fragrance.create({
    slug: key,
    name: m.name,
    brand: brandIds.get(m.house),
    concentration: m.concentration,
    year: m.year,
    gender: m.gender,
    accords: m.accords,
    notes: m.notes,
    description: m.description,
    tint: m.tint,
  })
  fragranceIds.set(key, fragrance._id)
}

// Listings
for (const m of mock) {
  const base = {
    slug: m.slug,
    fragrance: fragranceIds.get(slugify(`${m.house} ${m.name}`)),
    brandSlug: slugify(m.house),
    status: 'published' as const,
    addedAt: new Date(m.addedAt),
    // Mock photos are placeholder illustrations with no file; real ones arrive via Vercel Blob uploads
    photos: [],
  }
  switch (m.kind) {
    case 'decant':
      await DecantListing.create({
        ...base,
        bottles: m.bottles.map(({ sizeMl, remainingMl }) => ({ sizeMl, remainingMl })),
        prices: m.prices,
      })
      break
    case 'catch-release':
      await CatchReleaseListing.create({
        ...base,
        vials: m.vials.map(({ sizeMl, format, price, qty, note }) => ({ sizeMl, format, price, qty, note })),
      })
      break
    case 'full-bottle':
      await FullBottleListing.create({
        ...base,
        bottleSizeMl: m.bottleSizeMl,
        fillPercent: m.fillPercent,
        hasBox: m.hasBox,
        condition: m.condition,
        price: m.price,
        soldAt: m.sold ? new Date(m.addedAt) : null,
      })
      break
  }
}

await Settings.create(defaultSettings)

const counts = {
  brands: await Brand.countDocuments(),
  fragrances: await Fragrance.countDocuments(),
  listings: await Listing.countDocuments(),
  decants: await Listing.countDocuments({ kind: 'decant' }),
  catchRelease: await Listing.countDocuments({ kind: 'catch-release' }),
  fullBottles: await Listing.countDocuments({ kind: 'full-bottle' }),
  settings: await Settings.countDocuments(),
}
console.table(counts)

await disconnectDb()
