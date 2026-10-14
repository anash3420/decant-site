import { Router } from 'express'
import { requireAdmin, sameOriginOnly } from '../../middleware/auth.ts'
import { authRouter } from './auth.ts'
import { catalogRouter } from './catalog.ts'
import { inquiriesRouter } from './inquiries.ts'
import { listingsRouter } from './listings.ts'
import { settingsRouter } from './settings.ts'
import { statsRouter } from './stats.ts'
import { uploadsRouter } from './uploads.ts'

export const adminRouter = Router()

adminRouter.use(sameOriginOnly)
// Admin data is private and changes constantly; never let a browser or CDN cache it
adminRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
adminRouter.use('/auth', authRouter)

// Everything below needs a logged-in admin
adminRouter.use(requireAdmin)
adminRouter.use('/stats', statsRouter)
adminRouter.use('/inquiries', inquiriesRouter)
adminRouter.use('/listings', listingsRouter)
adminRouter.use('/uploads', uploadsRouter)
adminRouter.use('/settings', settingsRouter)
adminRouter.use('/', catalogRouter)
