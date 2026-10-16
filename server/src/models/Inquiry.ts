import { Schema, model, type InferSchemaType } from 'mongoose'

export const INQUIRY_STATUSES = ['new', 'contacted', 'confirmed', 'fulfilled', 'cancelled'] as const
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

const itemSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    kind: { type: String, enum: ['decant', 'catch-release', 'full-bottle'], required: true },
    // Snapshots: what the visitor saw when they sent it, even if the listing changes later
    slug: { type: String, required: true },
    nameSnapshot: { type: String, required: true },
    optionId: { type: String, required: true },
    optionLabel: { type: String, required: true },
    /** ml per unit; decants and vials */
    sizeMl: { type: Number },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    /** Decants: which bottles the held ml came from, so a cancellation puts it back in the right one */
    heldFrom: {
      type: [
        new Schema(
          { bottle: { type: Schema.Types.ObjectId, required: true }, ml: { type: Number, required: true } },
          { _id: false },
        ),
      ],
      default: undefined,
    },
  },
  { _id: false },
)

const inquirySchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    contact: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      facebook: { type: String, trim: true, maxlength: 300 },
    },
    fulfilment: {
      method: { type: String, enum: ['pickup', 'lettermail', 'tracked'], required: true },
      label: { type: String, required: true },
      cost: { type: Number, required: true, min: 0 },
      location: { type: String, trim: true, maxlength: 200 },
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    items: { type: [itemSchema], validate: (v: unknown[]) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    estimatedTotal: { type: Number, required: true, min: 0 },
    status: { type: String, enum: INQUIRY_STATUSES, default: 'new' },
    statusHistory: {
      type: [new Schema({ status: { type: String, enum: INQUIRY_STATUSES }, at: Date, note: String }, { _id: false })],
      default: [],
    },
    adminNotes: { type: String, default: '' },
    /**
     * Stock is held the moment the inquiry is created (buy-it-now style).
     * Cancelling releases it and flips this to false so it can't be released twice.
     */
    stockHeld: { type: Boolean, default: true },
    /** Created while stock deduction was switched off in Settings (test mode): nothing was held */
    stockSkipped: { type: Boolean, default: false },
    meta: {
      ipHash: { type: String },
      userAgent: { type: String, maxlength: 300 },
    },
  },
  { timestamps: true },
)

inquirySchema.index({ status: 1, createdAt: -1 })

export type InquiryDoc = InferSchemaType<typeof inquirySchema>
export const Inquiry = model('Inquiry', inquirySchema)
