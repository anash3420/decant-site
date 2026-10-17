import { Schema, model } from 'mongoose'

const imageSchema = new Schema(
  { url: { type: String, required: true }, pathname: String, width: Number, height: Number },
  { _id: false },
)

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Used in ?brand= filters; also copied onto listings as brandSlug */
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** Shown in the shop's brand banner */
    description: { type: String, default: '', maxlength: 2000 },
    /** Banner logo on wider screens, and an optional separate one for phones (falls back to `logo`) */
    logo: { type: imageSchema, default: undefined },
    logoMobile: { type: imageSchema, default: undefined },
    /** The Fragplace brand it was filled in from, if any */
    fragplaceId: { type: Number },
  },
  { timestamps: true },
)

export const Brand = model('Brand', brandSchema)
