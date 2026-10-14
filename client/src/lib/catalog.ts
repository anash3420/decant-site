import type { Fragrance, ListingKind } from '@shared/types.ts'
import { isSoldOut } from '@shared/stock.ts'
import { slugify } from '@shared/slug.ts'

export { slugify }

export const KINDS: { id: ListingKind; path: string; title: string; short: string; blurb: string }[] = [
  {
    id: 'decant',
    path: '/decants',
    title: 'Decants',
    short: 'Decant',
    blurb: 'Decanted from my own bottles into glass atomizers. Pick the size you want.',
  },
  {
    id: 'catch-release',
    path: '/catch-release',
    title: 'Catch & Release',
    short: 'Catch & Release',
    blurb: 'Samples and decants I picked up from other members, passed along as-is.',
  },
  {
    id: 'full-bottle',
    path: '/full-bottles',
    title: 'Full bottles',
    short: 'Full bottle',
    blurb: 'Whole bottles for sale. Fill level, box and condition are noted on each.',
  },
]

export const kindMeta = (kind: ListingKind) => KINDS.find((k) => k.id === kind)!

/** Houses in a list with counts, alphabetical */
export function brandsOf(list: Fragrance[]) {
  const map = new Map<string, { slug: string; name: string; count: number }>()
  for (const f of list) {
    const slug = slugify(f.house)
    const entry = map.get(slug) ?? { slug, name: f.house, count: 0 }
    entry.count++
    map.set(slug, entry)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const byBrand = (list: Fragrance[], brand: string | null) =>
  brand ? list.filter((f) => slugify(f.house) === brand) : list

/** In stock first, newest first within each group */
export const sortForDisplay = (list: Fragrance[]) =>
  [...list].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)) || b.addedAt.localeCompare(a.addedAt))
