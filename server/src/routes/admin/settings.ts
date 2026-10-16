import { Router } from 'express'
import { z } from 'zod'
import { FACEBOOK_URL } from '../../../../shared/validation.ts'
import { Settings } from '../../models/index.ts'
import { getSettings } from '../../services/settings.ts'

export const settingsRouter = Router()

const settingsInput = z.object({
  ownerFacebookUrl: z.string().trim().regex(FACEBOOK_URL, 'Use your Facebook profile link'),
  siteTagline: z.string().trim().max(200).default(''),
  fulfilment: z
    .array(
      z.object({
        id: z.enum(['pickup', 'lettermail', 'tracked']),
        label: z.string().trim().min(1).max(60),
        cost: z.number().min(0).max(1000),
        detail: z.string().trim().max(200).default(''),
        enabled: z.boolean().default(true),
      }),
    )
    .length(3)
    .refine((fs) => new Set(fs.map((f) => f.id)).size === 3, 'Each delivery option once')
    .refine((fs) => fs.some((f) => f.enabled), 'Keep at least one delivery option on'),
  lettermail: z.object({
    maxDecantMl: z.number().int().min(1).max(100),
    maxCatchReleaseMl: z.number().int().min(1).max(500),
  }),
  deductStock: z.boolean().default(true),
})

settingsRouter.get('/', async (_req, res) => {
  res.json({ settings: await getSettings() })
})

settingsRouter.put('/', async (req, res) => {
  const input = settingsInput.parse(req.body)
  await Settings.findOneAndUpdate({ key: 'site' }, input, { upsert: true, runValidators: true })
  res.json({ settings: await getSettings() })
})
