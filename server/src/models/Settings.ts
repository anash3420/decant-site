import { Schema, model, type InferSchemaType } from 'mongoose'
import { DEFAULT_LETTERMAIL_LIMITS } from '../../../shared/shipping.ts'

/** A single document (key: 'site') so shipping rates and limits can change without a deploy */
const settingsSchema = new Schema(
  {
    key: { type: String, default: 'site', unique: true, immutable: true },
    ownerFacebookUrl: { type: String, required: true },
    siteTagline: { type: String, default: '' },
    fulfilment: {
      type: [
        new Schema(
          {
            id: { type: String, enum: ['pickup', 'lettermail', 'tracked'], required: true },
            label: { type: String, required: true },
            cost: { type: Number, required: true, min: 0 },
            detail: { type: String, default: '' },
            enabled: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    lettermail: {
      maxDecantMl: { type: Number, default: DEFAULT_LETTERMAIL_LIMITS.maxDecantMl },
      maxCatchReleaseMl: { type: Number, default: DEFAULT_LETTERMAIL_LIMITS.maxCatchReleaseMl },
    },
  },
  { timestamps: true },
)

export type SettingsDoc = InferSchemaType<typeof settingsSchema>
export const Settings = model('Settings', settingsSchema)
