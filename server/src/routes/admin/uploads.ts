import express, { Router } from 'express'
import { HttpError } from '../../http.ts'
import { IMAGE_TYPES, storeImage } from '../../services/storage.ts'

export const uploadsRouter = Router()

/**
 * POST a single image as the raw request body (Content-Type: image/jpeg|png|webp|avif).
 * The admin panel resizes photos in the browser first, keeping uploads well under Vercel's 4.5MB body limit.
 * Returns { url, pathname }; attach it to a listing with PATCH /api/admin/listings/:id.
 */
uploadsRouter.post('/', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '4mb' }), async (req, res) => {
  const type = req.get('content-type')?.split(';')[0] ?? ''
  if (!IMAGE_TYPES[type] || !Buffer.isBuffer(req.body) || req.body.length === 0)
    throw new HttpError(415, 'unsupported_image', 'Upload a JPEG, PNG, WebP or AVIF image.')
  res.status(201).json(await storeImage(req.body, type))
})
