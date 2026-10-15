import type { Types } from 'mongoose'
import type { Concentration, FragranceCategory, Gender, ListingKind } from '../../../shared/types.ts'

/**
 * Plain-object shapes of documents as `.lean()` returns them, after populate().
 * Serializers (public catalog, admin views) take these instead of `any`.
 */

export interface LeanBrand {
  _id: Types.ObjectId
  name: string
  slug: string
}

export interface LeanFragrance {
  _id: Types.ObjectId
  slug: string
  name: string
  brand: LeanBrand | null
  category: FragranceCategory
  concentration: Concentration
  year?: number
  gender: Gender
  accords: string[]
  notes: { top: string[]; heart: string[]; base: string[] }
  description: string
  tint: string
}

export interface LeanPhoto {
  _id: Types.ObjectId
  url: string
  pathname?: string
  width?: number
  height?: number
  label: string
  order: number
}

export interface LeanBottle {
  _id: Types.ObjectId
  sizeMl: number
  remainingMl: number
  batchCode?: string
  acquiredAt?: Date
  costPaid?: number
}

export interface LeanVial {
  _id: Types.ObjectId
  sizeMl: number
  format: string
  price: number
  qty: number
  note?: string
  sourcedFrom?: string
  costPaid?: number
}

/** A listing of any kind; kind-specific fields are present only for that kind */
export interface LeanListing<F = LeanFragrance> {
  _id: Types.ObjectId
  slug: string
  kind: ListingKind
  status: 'draft' | 'published' | 'archived'
  brandSlug: string
  listingNote?: string
  addedAt: Date
  updatedAt: Date
  photos: LeanPhoto[]
  fragrance: F | null
  // decant
  bottles?: LeanBottle[]
  prices?: { sizeMl: number; price: number }[]
  // catch & release
  vials?: LeanVial[]
  // full bottle
  bottleSizeMl?: number
  fillPercent?: number
  hasBox?: boolean
  condition?: string
  price?: number
  soldAt?: Date | null
  costPaid?: number
}
