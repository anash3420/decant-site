import { Schema, model } from 'mongoose'

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Used in ?brand= filters; also copied onto listings as brandSlug */
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
)

export const Brand = model('Brand', brandSchema)
