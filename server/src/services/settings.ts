import { DEFAULT_LETTERMAIL_LIMITS } from '../../../shared/shipping.ts'
import { Settings } from '../models/index.ts'

export async function getSettings() {
  const doc = await Settings.findOne({ key: 'site' }).lean()
  if (!doc) throw new Error('Settings document missing. Run `npm run seed` (dev) or create it in the admin panel.')
  return {
    ownerFacebookUrl: doc.ownerFacebookUrl,
    siteTagline: doc.siteTagline ?? '',
    fulfilment: doc.fulfilment.map((f) => ({
      id: f.id as 'pickup' | 'lettermail' | 'tracked',
      label: f.label,
      cost: f.cost,
      detail: f.detail ?? '',
      enabled: f.enabled ?? true,
    })),
    lettermail: {
      maxDecantMl: doc.lettermail?.maxDecantMl ?? DEFAULT_LETTERMAIL_LIMITS.maxDecantMl,
      maxCatchReleaseMl: doc.lettermail?.maxCatchReleaseMl ?? DEFAULT_LETTERMAIL_LIMITS.maxCatchReleaseMl,
    },
  }
}

/** What visitors may see: no disabled options */
export async function getPublicSettings() {
  const s = await getSettings()
  return { ...s, fulfilment: s.fulfilment.filter((f) => f.enabled).map(({ enabled: _, ...f }) => f) }
}
