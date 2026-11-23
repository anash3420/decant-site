import type { ShopListing } from '@shared/types.ts'
import { getOptions, isSoldOut } from '@shared/shop.ts'

/** Days a decant counts as "New" after it's added */
export const NEW_FOR_DAYS = 30

export const isNew = (listing: ShopListing, now = Date.now()) =>
  now - Date.parse(listing.addedAt) < NEW_FOR_DAYS * 24 * 60 * 60 * 1000

export const hasSize = (listing: ShopListing, sizeMl: number) =>
  getOptions(listing).some((o) => o.sizeMl === sizeMl && o.available)

export const byNewest = (a: ShopListing, b: ShopListing) => b.addedAt.localeCompare(a.addedAt)

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

/** In-stock decants not in `exclude`, sharing the most accords with `accords`, then newest first */
export function similar(catalog: ShopListing[], accords: string[], exclude: Set<string>, n: number) {
  const wanted = new Set(accords.map((a) => a.toLowerCase()))
  return catalog
    .filter((l) => !exclude.has(l.slug) && !isSoldOut(l))
    .map((l) => ({ l, shared: l.accords.filter((a) => wanted.has(a.toLowerCase())).length }))
    .sort((a, b) => b.shared - a.shared || byNewest(a.l, b.l))
    .slice(0, n)
    .map((x) => x.l)
}

/** A text's first sentence, for a one-line story or house line */
export function firstSentence(text: string) {
  const match = text.match(/^.*?[.!?](?=\s|$)/)
  return (match ? match[0] : text).trim()
}

export const productPath = (slug: string) => `/fragrance/${slug}`
export const housePath = (slug: string) => `/houses/${slug}`
