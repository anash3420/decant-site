import type { ClientSession, Types } from 'mongoose'
import { HttpError } from '../http.ts'
import { Listing } from '../models/index.ts'

/**
 * Stock is held when an inquiry is created (buy-it-now style) and released if it's cancelled.
 * Both run inside the caller's transaction: if two visitors race for the last 5ml, MongoDB raises a
 * write conflict on the second, the transaction retries, re-reads the bottle and finds it empty.
 */

export interface HeldFrom {
  bottle: Types.ObjectId
  ml: number
}

interface StockLine {
  listing: Types.ObjectId
  kind: 'decant' | 'catch-release' | 'full-bottle'
  slug: string
  optionId: string
  sizeMl?: number
  qty: number
}

type BottleSub = { _id: Types.ObjectId; remainingMl: number }
type VialSub = { _id: Types.ObjectId; qty: number }
type StockDoc = {
  bottles?: BottleSub[]
  vials?: VialSub[]
  soldAt?: Date | null
  save: (opts: { session: ClientSession }) => Promise<unknown>
}

const unavailable = (line: StockLine) =>
  new HttpError(409, 'unavailable', 'Some items are no longer available.', [
    { slug: line.slug, optionId: line.optionId, reason: 'insufficient' },
  ])

/** Deducts stock for one line. Returns which bottles decant ml came from, so a release can put it back. */
export async function holdStock(line: StockLine, session: ClientSession): Promise<HeldFrom[]> {
  const doc = (await Listing.findById(line.listing).session(session)) as unknown as StockDoc | null
  if (!doc) throw unavailable(line)
  const heldFrom: HeldFrom[] = []

  switch (line.kind) {
    case 'decant': {
      let need = line.sizeMl! * line.qty
      // Fullest bottle first, so partly used bottles get finished last
      for (const bottle of [...doc.bottles!].sort((a, b) => b.remainingMl - a.remainingMl)) {
        if (need === 0) break
        const take = Math.min(bottle.remainingMl, need)
        if (take === 0) continue
        bottle.remainingMl -= take
        need -= take
        heldFrom.push({ bottle: bottle._id, ml: take })
      }
      if (need > 0) throw unavailable(line)
      break
    }
    case 'catch-release': {
      const vial = doc.vials!.find((v) => String(v._id) === line.optionId)
      if (!vial || vial.qty < line.qty) throw unavailable(line)
      vial.qty -= line.qty
      break
    }
    case 'full-bottle': {
      if (doc.soldAt || line.qty !== 1) throw unavailable(line)
      doc.soldAt = new Date()
      break
    }
  }

  await doc.save({ session })
  return heldFrom
}

/** Puts held stock back, e.g. when an inquiry is cancelled. Missing bottles/vials (deleted since) are skipped. */
export async function releaseStock(line: StockLine & { heldFrom?: HeldFrom[] }, session: ClientSession) {
  const doc = (await Listing.findById(line.listing).session(session)) as unknown as StockDoc | null
  if (!doc) return

  switch (line.kind) {
    case 'decant':
      for (const h of line.heldFrom ?? []) {
        const bottle = doc.bottles!.find((b) => String(b._id) === String(h.bottle))
        if (bottle) bottle.remainingMl += h.ml
      }
      break
    case 'catch-release': {
      const vial = doc.vials!.find((v) => String(v._id) === line.optionId)
      if (vial) vial.qty += line.qty
      break
    }
    case 'full-bottle':
      doc.soldAt = null
      break
  }

  await doc.save({ session })
}
