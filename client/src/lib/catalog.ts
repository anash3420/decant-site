import type { DecantListing } from '@shared/types.ts'
import { getOptions } from '@shared/stock.ts'

/** Days a decant counts as "New" after it's added */
export const NEW_FOR_DAYS = 30

/** The cheapest size still in stock, shown as "From $X for N ml". Falls back to the smallest size when sold out. */
export function fromPrice(listing: DecantListing) {
  const options = getOptions(listing)
  const inStock = options.filter((o) => o.available)
  const cheapest = (inStock.length ? inStock : options).reduce((a, b) => (b.price < a.price ? b : a))
  return { price: cheapest.price, sizeMl: cheapest.sizeMl ?? 0 }
}

export const isNew = (listing: DecantListing, now = Date.now()) =>
  now - Date.parse(listing.addedAt) < NEW_FOR_DAYS * 24 * 60 * 60 * 1000

export const hasSize = (listing: DecantListing, sizeMl: number) =>
  getOptions(listing).some((o) => o.sizeMl === sizeMl && o.available)

export const byNewest = (a: DecantListing, b: DecantListing) => b.addedAt.localeCompare(a.addedAt)

const WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
]
/** "Thirteen" for 13; digits above twenty */
export const numberWord = (n: number) => WORDS[n] ?? String(n)

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const productPath = (slug: string) => `/fragrance/${slug}`
export const housePath = (slug: string) => `/houses/${slug}`
