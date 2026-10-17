import { Schema, model } from 'mongoose'
import { CONCENTRATIONS, FRAGRANCE_CATEGORIES } from '../../../shared/types.ts'

/** The scent itself, written once and shared by every listing of it (decant, vial, full bottle) */
const fragranceSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    /** niche · designer · designer-private · dupe; drives the shop's category pages and labels */
    category: { type: String, enum: FRAGRANCE_CATEGORIES, required: true, default: 'designer', index: true },
    concentration: { type: String, enum: CONCENTRATIONS, required: true },
    year: { type: Number, min: 1800, max: 2100 },
    gender: { type: String, enum: ['Feminine', 'Masculine', 'Unisex'], required: true },
    accords: { type: [String], default: [] },
    notes: {
      top: { type: [String], default: [] },
      heart: { type: [String], default: [] },
      base: { type: [String], default: [] },
    },
    description: { type: String, default: '' },
    /** Bottle photo for the scent itself; listings without photos of their own show it */
    photo: {
      type: new Schema(
        { url: { type: String, required: true }, pathname: String, width: Number, height: Number },
        { _id: false },
      ),
      default: undefined,
    },
    /** The Fragplace fragrance this was filled in from, if any (for refreshing notes and accords later) */
    fragplaceId: { type: Number },
    /** Bottle drawing colour when there's no photo at all */
    tint: { type: String, default: '#B8A88A', match: /^#[0-9a-f]{6}$/i },
  },
  { timestamps: true },
)

export const Fragrance = model('Fragrance', fragranceSchema)
