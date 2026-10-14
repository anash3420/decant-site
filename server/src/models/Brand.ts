import { Schema, model, type InferSchemaType } from 'mongoose'

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Used in ?brand= filters; also copied onto listings as brandSlug */
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
)

export type BrandDoc = InferSchemaType<typeof brandSchema>
export const Brand = model('Brand', brandSchema)
