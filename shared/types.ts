// Shapes mirror the planned API so epic 3 only swaps the data source.

export type Gender = 'Feminine' | 'Masculine' | 'Unisex'

export type ListingKind = 'decant' | 'catch-release' | 'full-bottle'

export interface PriceTier {
  sizeMl: number
  price: number
}

export interface Bottle {
  id: string
  sizeMl: number
  remainingMl: number
}

/** Until real photos exist, a photo without `src` renders as a placeholder illustration */
export interface Photo {
  label: string
  src?: string
  variant?: 'vial' | 'bottle' | 'box'
  /** 0–1 liquid level for the placeholder */
  fill?: number
}

interface ListingBase {
  slug: string
  kind: ListingKind
  name: string
  house: string
  concentration: string
  year?: number
  gender: Gender
  accords: string[]
  notes: { top: string[]; heart: string[]; base: string[] }
  description: string
  /** Placeholder tint until real photos exist */
  tint: string
  photos?: Photo[]
  addedAt: string
}

/** Decanted from my own bottles; stock is derived from ml left */
export interface DecantListing extends ListingBase {
  kind: 'decant'
  bottles: Bottle[]
  prices: PriceTier[]
}

/** Vials picked up from other members and passed along */
export interface CatchReleaseListing extends ListingBase {
  kind: 'catch-release'
  vials: { id: string; sizeMl: number; format: string; price: number; qty: number; note?: string }[]
}

/** A whole (possibly partial) bottle for sale */
export interface FullBottleListing extends ListingBase {
  kind: 'full-bottle'
  bottleSizeMl: number
  /** 0–100 */
  fillPercent: number
  hasBox: boolean
  condition: string
  price: number
  sold: boolean
}

export type Fragrance = DecantListing | CatchReleaseListing | FullBottleListing

export interface InquiryItem {
  slug: string
  optionId: string
  qty: number
}

export type FulfilmentId = 'pickup' | 'lettermail' | 'tracked'
