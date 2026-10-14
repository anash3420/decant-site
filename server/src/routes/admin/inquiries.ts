import { Router } from 'express'
import mongoose, { type Types } from 'mongoose'
import { z } from 'zod'
import { HttpError, notFound } from '../../http.ts'
import { INQUIRY_STATUSES, Inquiry } from '../../models/index.ts'
import type { InquiryDoc, InquiryStatus } from '../../models/Inquiry.ts'
import { releaseStock } from '../../services/stock.ts'
import { objectId, searchRegex } from '../../validation.ts'

export const inquiriesRouter = Router()

/**
 * Where an inquiry can go next. Fulfilled and cancelled are final: a cancellation has already
 * released its stock, and re-holding it later could oversell.
 */
const NEXT_STATUSES: Record<InquiryStatus, InquiryStatus[]> = {
  new: ['contacted', 'confirmed', 'fulfilled', 'cancelled'],
  contacted: ['confirmed', 'fulfilled', 'cancelled'],
  confirmed: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
}

inquiriesRouter.get('/', async (req, res) => {
  const q = z
    .object({
      status: z.enum(INQUIRY_STATUSES).optional(),
      search: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    })
    .parse(req.query)

  const filter: Record<string, unknown> = {}
  if (q.status) filter.status = q.status
  if (q.search) {
    const rx = searchRegex(q.search)
    filter.$or = [{ reference: rx }, { 'contact.name': rx }, { 'items.nameSnapshot': rx }]
  }

  const [docs, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .select('reference createdAt status contact fulfilment items.qty items.nameSnapshot estimatedTotal')
      .lean(),
    Inquiry.countDocuments(filter),
  ])

  res.json({
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
    inquiries: docs.map((d) => ({
      id: String(d._id),
      reference: d.reference,
      createdAt: d.createdAt,
      status: d.status,
      name: d.contact?.name,
      facebook: d.contact?.facebook,
      fulfilment: d.fulfilment?.label,
      itemCount: d.items.reduce((n, i) => n + i.qty, 0),
      itemNames: d.items.map((i) => i.nameSnapshot),
      estimatedTotal: d.estimatedTotal,
    })),
  })
})

inquiriesRouter.get('/:id', async (req, res) => {
  const doc = await Inquiry.findById(objectId.parse(req.params.id)).lean()
  if (!doc) throw notFound('Inquiry')
  res.json({ inquiry: toAdminInquiry(doc) })
})

inquiriesRouter.patch('/:id', async (req, res) => {
  const id = objectId.parse(req.params.id)
  const body = z
    .object({
      status: z.enum(INQUIRY_STATUSES).optional(),
      /** Optional note stored with the status change, e.g. "paid by e-transfer" */
      note: z.string().trim().max(500).optional(),
      adminNotes: z.string().max(5000).optional(),
    })
    .parse(req.body)

  const updated = await mongoose.connection.transaction(async (session) => {
    const doc = await Inquiry.findById(id).session(session)
    if (!doc) throw notFound('Inquiry')

    if (body.status && body.status !== doc.status) {
      const from = doc.status as InquiryStatus
      if (!NEXT_STATUSES[from].includes(body.status))
        throw new HttpError(409, 'invalid_transition', `A ${from} inquiry can't be marked ${body.status}.`)

      if (body.status === 'cancelled' && doc.stockHeld) {
        for (const item of doc.items) {
          await releaseStock(
            {
              listing: item.listing,
              kind: item.kind as 'decant' | 'catch-release' | 'full-bottle',
              slug: item.slug,
              optionId: item.optionId,
              sizeMl: item.sizeMl ?? undefined,
              qty: item.qty,
              heldFrom: item.heldFrom ?? undefined,
            },
            session,
          )
        }
        doc.stockHeld = false
      }
      doc.status = body.status
      doc.statusHistory.push({ status: body.status, at: new Date(), note: body.note })
    }
    if (body.adminNotes !== undefined) doc.adminNotes = body.adminNotes

    await doc.save({ session })
    return doc.toObject()
  })

  res.json({ inquiry: toAdminInquiry(updated) })
})

type InquiryObject = InquiryDoc & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }

function toAdminInquiry(d: InquiryObject) {
  return {
    id: String(d._id),
    reference: d.reference,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    status: d.status,
    nextStatuses: NEXT_STATUSES[d.status as InquiryStatus],
    contact: d.contact,
    fulfilment: d.fulfilment,
    notes: d.notes,
    items: d.items.map((i) => ({
      listingId: String(i.listing),
      kind: i.kind,
      slug: i.slug,
      nameSnapshot: i.nameSnapshot,
      optionId: i.optionId,
      optionLabel: i.optionLabel,
      sizeMl: i.sizeMl,
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
    subtotal: d.subtotal,
    estimatedTotal: d.estimatedTotal,
    statusHistory: d.statusHistory,
    adminNotes: d.adminNotes,
    stockHeld: d.stockHeld,
  }
}
