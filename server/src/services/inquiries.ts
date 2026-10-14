import { createHash, randomInt } from 'node:crypto'
import mongoose from 'mongoose'
import { z } from 'zod'
import { getOption, maxQty } from '../../../shared/stock.ts'
import { lettermailBlockedReason } from '../../../shared/shipping.ts'
import { FACEBOOK_URL } from '../../../shared/validation.ts'
import { env } from '../env.ts'
import { HttpError } from '../http.ts'
import { Inquiry } from '../models/index.ts'
import { findCatalogListingsForUpdate } from './catalog.ts'
import { getSettings } from './settings.ts'
import { holdStock } from './stock.ts'

export const createInquirySchema = z
  .object({
    contact: z.object({
      name: z.string().trim().min(1, 'Please add your name.').max(100),
      facebook: z.string().trim().max(300).regex(FACEBOOK_URL, 'Paste your Facebook profile link.'),
    }),
    fulfilment: z.enum(['pickup', 'lettermail', 'tracked']),
    location: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
    items: z
      .array(
        z.object({
          slug: z.string().trim().min(1).max(120),
          optionId: z.string().trim().min(1).max(60),
          qty: z.number().int().min(1).max(20),
        }),
      )
      .min(1, 'Your inquiry is empty.')
      .max(30),
    /** What the visitor saw. If prices changed since, we stop and show them the new total. */
    expectedTotal: z.number().nonnegative().optional(),
    /** Honeypot: hidden from people, bots fill it */
    website: z.string().optional(),
  })
  .refine((d) => d.fulfilment === 'pickup' || Boolean(d.location), {
    path: ['location'],
    message: 'Add your city and postal code so I can quote shipping.',
  })

export type CreateInquiryInput = z.infer<typeof createInquirySchema>

// No 0/O or 1/I/L, so references are easy to read out over Messenger
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const newReference = () => 'D-' + Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join('')

export const hashIp = (ip: string | undefined) =>
  ip ? createHash('sha256').update(ip + env.JWT_SECRET).digest('hex').slice(0, 32) : undefined

/** Merge duplicate lines (same listing + option) so stock checks see the real total */
function mergeItems(items: CreateInquiryInput['items']) {
  const merged = new Map<string, CreateInquiryInput['items'][number]>()
  for (const i of items) {
    const key = `${i.slug}::${i.optionId}`
    const prev = merged.get(key)
    merged.set(key, prev ? { ...prev, qty: prev.qty + i.qty } : { ...i })
  }
  return [...merged.values()]
}

export async function createInquiry(input: CreateInquiryInput, meta: { ip?: string; userAgent?: string }) {
  const settings = await getSettings()
  const method = settings.fulfilment.find((f) => f.id === input.fulfilment && f.enabled)
  if (!method) throw new HttpError(400, 'fulfilment_unavailable', 'That delivery option is not available right now.')

  const items = mergeItems(input.items)

  // connection.transaction() retries the whole callback on transient errors (e.g. a write conflict
  // when two visitors hold the same bottle at once), so every read below is fresh on each attempt.
  return mongoose.connection.transaction(async (session) => {
    const rows = await findCatalogListingsForUpdate([...new Set(items.map((i) => i.slug))], session)
    const bySlug = new Map(rows.map((r) => [r.listing.slug, r]))

    const problems: { slug: string; optionId: string; reason: string; available?: number }[] = []
    const lines = items.flatMap((item) => {
      const row = bySlug.get(item.slug)
      const option = row && getOption(row.listing, item.optionId)
      if (!row || !option) {
        problems.push({ slug: item.slug, optionId: item.optionId, reason: 'not_found' })
        return []
      }
      const available = maxQty(row.listing, item.optionId, items)
      if (item.qty > available) problems.push({ slug: item.slug, optionId: item.optionId, reason: 'insufficient', available })
      return [{ item, row, option }]
    })
    if (problems.length) throw new HttpError(409, 'unavailable', 'Some items are no longer available.', problems)

    if (input.fulfilment === 'lettermail') {
      const reason = lettermailBlockedReason(
        lines.map((l) => ({ f: l.row.listing, option: l.option, item: { qty: l.item.qty } })),
        settings.lettermail,
      )
      if (reason) throw new HttpError(409, 'lettermail_unavailable', reason)
    }

    const subtotal = lines.reduce((sum, l) => sum + l.option.price * l.item.qty, 0)
    const estimatedTotal = subtotal + method.cost
    if (input.expectedTotal !== undefined && Math.abs(input.expectedTotal - estimatedTotal) > 0.001) {
      throw new HttpError(409, 'price_changed', 'Prices changed since you added these. Please check the new total.', {
        estimatedTotal,
      })
    }

    // Hold stock (buy-it-now): fails the whole inquiry if any line lost the race
    const stored = []
    for (const l of lines) {
      const line = {
        listing: l.row.id,
        kind: l.row.listing.kind,
        slug: l.row.listing.slug,
        optionId: l.item.optionId,
        sizeMl: l.option.sizeMl,
        qty: l.item.qty,
      }
      const heldFrom = await holdStock(line, session)
      stored.push({
        ...line,
        nameSnapshot: `${l.row.listing.house} ${l.row.listing.name}`,
        optionLabel: l.option.label,
        unitPrice: l.option.price,
        heldFrom: heldFrom.length ? heldFrom : undefined,
      })
    }

    let reference = newReference()
    while (await Inquiry.exists({ reference }).session(session)) reference = newReference()

    const [inquiry] = await Inquiry.create(
      [
        {
          reference,
          contact: input.contact,
          fulfilment: {
            method: method.id,
            label: method.label,
            cost: method.cost,
            location: input.fulfilment === 'pickup' ? undefined : input.location,
          },
          notes: input.notes || undefined,
          items: stored,
          subtotal,
          estimatedTotal,
          status: 'new',
          statusHistory: [{ status: 'new', at: new Date() }],
          stockHeld: true,
          meta: { ipHash: hashIp(meta.ip), userAgent: meta.userAgent?.slice(0, 300) },
        },
      ],
      { session },
    )

    return toPublicInquiry(inquiry!)
  })
}

/** What the visitor gets back (and keeps in their History). No internal ids or admin fields. */
export function toPublicInquiry(i: InstanceType<typeof Inquiry>) {
  return {
    reference: i.reference,
    createdAt: i.createdAt.toISOString(),
    status: i.status,
    contact: { name: i.contact!.name, facebook: i.contact!.facebook },
    fulfilment: {
      method: i.fulfilment!.method,
      label: i.fulfilment!.label,
      cost: i.fulfilment!.cost,
      location: i.fulfilment!.location ?? undefined,
    },
    notes: i.notes ?? undefined,
    items: i.items.map((it) => ({
      slug: it.slug,
      nameSnapshot: it.nameSnapshot,
      kind: it.kind,
      optionId: it.optionId,
      optionLabel: it.optionLabel,
      qty: it.qty,
      unitPrice: it.unitPrice,
    })),
    subtotal: i.subtotal,
    estimatedTotal: i.estimatedTotal,
  }
}

export async function getInquiryStatus(reference: string) {
  const doc = await Inquiry.findOne({ reference }, { reference: 1, status: 1, updatedAt: 1 }).lean()
  if (!doc) return null
  return { reference: doc.reference, status: doc.status, updatedAt: doc.updatedAt.toISOString() }
}
