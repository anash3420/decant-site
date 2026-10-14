import { Schema, model } from 'mongoose'

/**
 * What's for sale. One collection, three kinds (Mongoose discriminators on `kind`),
 * so the homepage rows come from a single indexed query.
 */

const photoSchema = new Schema(
  {
    url: { type: String, required: true },
    /** Vercel Blob pathname, needed to delete the file later */
    pathname: { type: String },
    label: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: true },
)

const listingSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fragrance: { type: Schema.Types.ObjectId, ref: 'Fragrance', required: true, index: true },
    /** Copied from the brand so ?brand= filtering needs no $lookup */
    brandSlug: { type: String, required: true, lowercase: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    photos: { type: [photoSchema], default: [] },
    listingNote: { type: String, default: '' },
    addedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, discriminatorKey: 'kind' },
)

listingSchema.index({ status: 1, kind: 1, addedAt: -1 })
listingSchema.index({ status: 1, brandSlug: 1 })

export const Listing = model('Listing', listingSchema)

// ── Decant: from my own bottles; availability = total ml left ──────────────────
const decantSchema = new Schema({
  bottles: {
    type: [
      new Schema({
        sizeMl: { type: Number, required: true, min: 1 },
        remainingMl: { type: Number, required: true, min: 0 },
        batchCode: { type: String },
        acquiredAt: { type: Date },
        /** Admin only */
        costPaid: { type: Number, min: 0 },
      }),
    ],
    default: [],
  },
  prices: {
    type: [
      new Schema(
        { sizeMl: { type: Number, required: true, min: 1 }, price: { type: Number, required: true, min: 0 } },
        { _id: false },
      ),
    ],
    validate: (v: unknown[]) => v.length > 0,
  },
})

// ── Catch & Release: vials picked up from other members ────────────────────────
const catchReleaseSchema = new Schema({
  vials: {
    type: [
      new Schema({
        sizeMl: { type: Number, required: true, min: 0.5 },
        format: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        qty: { type: Number, required: true, min: 0 },
        note: { type: String },
        /** Admin only */
        sourcedFrom: { type: String },
        costPaid: { type: Number, min: 0 },
      }),
    ],
    validate: (v: unknown[]) => v.length > 0,
  },
})

// ── Full bottle: one of a kind ────────────────────────────────────────────────
const fullBottleSchema = new Schema({
  bottleSizeMl: { type: Number, required: true, min: 1 },
  fillPercent: { type: Number, required: true, min: 0, max: 100 },
  hasBox: { type: Boolean, required: true },
  condition: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  /** Set when an inquiry holds it; cleared if that inquiry is cancelled */
  soldAt: { type: Date, default: null },
  /** Admin only */
  costPaid: { type: Number, min: 0 },
})

export const DecantListing = Listing.discriminator('decant', decantSchema)
export const CatchReleaseListing = Listing.discriminator('catch-release', catchReleaseSchema)
export const FullBottleListing = Listing.discriminator('full-bottle', fullBottleSchema)
