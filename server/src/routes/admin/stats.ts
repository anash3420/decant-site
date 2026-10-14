import { Router } from 'express'
import type { LeanListing } from '../../models/lean.ts'
import { Inquiry, Listing } from '../../models/index.ts'

export const statsRouter = Router()

const OPEN = ['new', 'contacted', 'confirmed']
/** Decants with less than this many ml left (in total) show up as running low */
const LOW_DECANT_ML = 15

type StockRow = LeanListing<{ name: string }>

/** Dashboard numbers: inquiries by status, what's held, recent fulfilled value, stock needing attention */
statsRouter.get('/', async (_req, res) => {
  const since = new Date(Date.now() - 30 * 86_400_000)
  const [byStatus, openValue, fulfilled30, decants, vials] = await Promise.all([
    Inquiry.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Inquiry.aggregate<{ total: number }>([
      { $match: { status: { $in: OPEN } } },
      { $group: { _id: null, total: { $sum: '$estimatedTotal' } } },
    ]),
    Inquiry.aggregate<{ total: number; count: number }>([
      { $match: { status: 'fulfilled', updatedAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$subtotal' }, count: { $sum: 1 } } },
    ]),
    Listing.find({ kind: 'decant', status: 'published' }, { slug: 1, kind: 1, bottles: 1 })
      .populate('fragrance', 'name')
      .lean<StockRow[]>(),
    Listing.find({ kind: 'catch-release', status: 'published' }, { slug: 1, kind: 1, vials: 1 })
      .populate('fragrance', 'name')
      .lean<StockRow[]>(),
  ])

  const name = (l: StockRow) => l.fragrance?.name ?? l.slug
  const lowStock = [
    ...decants.flatMap((l) => {
      const left = (l.bottles ?? []).reduce((n, b) => n + b.remainingMl, 0)
      return left < LOW_DECANT_ML ? [{ id: String(l._id), name: name(l), kind: l.kind, detail: `${left}ml left` }] : []
    }),
    ...vials.flatMap((l) => {
      const left = (l.vials ?? []).reduce((n, v) => n + v.qty, 0)
      return left === 0 ? [{ id: String(l._id), name: name(l), kind: l.kind, detail: 'All vials gone' }] : []
    }),
  ]

  res.json({
    inquiries: Object.fromEntries(
      ['new', 'contacted', 'confirmed', 'fulfilled', 'cancelled'].map((s) => [
        s,
        byStatus.find((b) => b._id === s)?.count ?? 0,
      ]),
    ),
    openValue: openValue[0]?.total ?? 0,
    fulfilledLast30Days: { count: fulfilled30[0]?.count ?? 0, total: fulfilled30[0]?.total ?? 0 },
    lowStock,
  })
})
