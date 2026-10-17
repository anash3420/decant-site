import type { Fragrance, FragranceCategory, ListingKind } from '@shared/types.ts'
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

/** Fragrance categories: their shop pages, labels and badge colours */
export const CATEGORIES: {
  id: FragranceCategory
  path: string
  title: string
  label: string
  blurb: string
  badge: string
}[] = [
  {
    id: 'niche',
    path: '/niche',
    title: 'Niche',
    label: 'Niche',
    blurb: 'Independent and artisan houses: Diptyque, Le Labo, Xerjoff, Creed and friends.',
    badge: 'bg-[#E8EEF6] text-[#2F4B73]',
  },
  {
    id: 'designer',
    path: '/designer',
    title: 'Designer',
    label: 'Designer',
    blurb: 'The big fashion houses’ mainline releases: Dior, Chanel, Guerlain and more.',
    badge: 'bg-[#EFEAE2] text-[#6B5432]',
  },
  {
    id: 'designer-private',
    path: '/designer-private',
    title: 'Designer private lines',
    label: 'Private line',
    blurb: 'The exclusive collections designer houses sell separately, like Tom Ford Private Blend and Dior Privée.',
    badge: 'bg-[#F1E6EC] text-[#6E2E4F]',
  },
  {
    id: 'dupe',
    path: '/dupes',
    title: 'Dupes',
    label: 'Dupe',
    blurb: 'Inspired-by alternatives to famous scents, for a fraction of the price.',
    badge: 'bg-[#E7F0EA] text-[#2F5E43]',
  },
]

export const categoryMeta = (category: FragranceCategory) => CATEGORIES.find((c) => c.id === category)!

export const byCategory = (list: Fragrance[], category: FragranceCategory | null | undefined) =>
  category ? list.filter((f) => f.category === category) : list

/** Houses in a list with counts, alphabetical */
export function brandsOf(list: Fragrance[]) {
  const map = new Map<string, { slug: string; name: string; count: number }>()
  for (const f of list) {
    const slug = f.brandSlug
    const entry = map.get(slug) ?? { slug, name: f.house, count: 0 }
    entry.count++
    map.set(slug, entry)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const byBrand = (list: Fragrance[], brand: string | null) =>
  brand ? list.filter((f) => f.brandSlug === brand) : list

/** In stock first, newest first within each group */
export const sortForDisplay = (list: Fragrance[]) =>
  [...list].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)) || b.addedAt.localeCompare(a.addedAt))
